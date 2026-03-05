(function () {
    'use strict';


    /**
     * 画面（新規、編集）表示時のイベント
     *  ・合計時間フィールドの編集不可制御
     *  ・日報一括登録レコードIDフィールドの編集不可制御
     */
    kintone.events.on([
        'app.record.create.show',
        'app.record.edit.show',
        'app.record.index.edit.show',
    ], function (event) {

        // kintoneの日時フィールドの値から生成（フィールドコードが「日時」）
        const record = event.record;
        // console.log(Array.isArray(record['作業日'].value));
        // console.log(Array.isArray(record['報告内容'].value));
        // 合計時間フィールドを非活性にする
        event.record.合計時間.disabled = true;

        // 日報一括登録レコードIDフィールドを非活性にする
        event.record.日報一括登録レコードID.disabled = true;

        // console.log(event.record);

        return event;

    });

    /**
    * 画面（新規、編集）レコード変更時のイベント
    *  ・作業時間を分から時間に変更し、合計時間フィールドに表示
    */
    kintone.events.on([
        // テーブルが追加・削除された際に処理が起きるよう'app.record.create.change.報告内容'を追加
        'app.record.create.change.作業時間_分',
        'app.record.edit.change.作業時間_分',
        'app.record.create.change.報告内容',
        'app.record.edit.change.報告内容',
    ], function (event) {
        const record = event.record;
        let totalTime = 0;


        // 報告内容テーブル内にある作業時間を合計
        record.報告内容.value.forEach(element => {
            if (isNaN(element.value.作業時間_分.value)) element.value.作業時間_分.value = 0; // もし作業時間が何も入力されなかった場合、0に変換する
            totalTime += Number(element.value.作業時間_分.value);
        });

        // 合計時間を60で割ることで分単位から時間単位に変換
        let val = totalTime * 100 / 60;

        // 小数点2以下まで出力するように修正
        record.合計時間.value = Math.round(val) / 100;

        return event;
    });

    /**
     * 画面（新規、編集、一覧編集）保存時のイベント
     *  ・「担当者」が複数人入力されている場合は入力エラーを表示する
     *  ・「報告内容」テーブルの「作業時間（分）」の値が「0以下」の場合は入力エラーを表示する
     *  ・「合計時間」の値が8時間を超えている場合は勤務時間超過エラーを表示する
     *  ・登録されている日報の中に、「担当者」と「作業日」の組合せが同じレコードが存在する場合は重複エラーを表示する
     */
    kintone.events.on([
        'app.record.create.submit',
        'app.record.index.edit.submit',
        'app.record.edit.submit',
    ], async function (event) {

        const record = event.record;
        const tantoshaMei = record.担当者.value;
        const sagyobi = record.作業日.value;
        try {

            const formInfo = await kintone.app.getFormFields(); // formの情報を取得するAPI
            const kinmuJikan = 8; // 勤務時間の定数化
            const recordId = await kintone.app.record.getId(); // 登録されたレコード情報に割り振られるID

            // エラー判別。trueになるとエラーが発生
            let hasError = false;

            // 担当者が入力されていないとき
            if (tantoshaMei.length < 1) {
                record.担当者.error = formInfo.担当者.label + 'を入力してください';
                hasError = true;
            }

            // 作業日が入力されていないとき
            if (!sagyobi) {
                record.作業日.error = formInfo.作業日.label + 'を入力してください';
                hasError = true;
            }

            // 報告内容テーブルの必須項目が入力されていないとき
            for (let i = 0; i < record.報告内容.value.length; i++) {
                if (!record.報告内容.value[i].value.プロジェクトコード.value) {
                    record.報告内容.value[i].value.プロジェクトコード.error = formInfo.報告内容.fields.プロジェクトコード.label + 'を選択してください';
                    hasError = true;
                }

                // 入力値が0の時、エラーメッセージを表示
                if (Number(record.報告内容.value[i].value.作業時間_分.value) === 0) {
                    record.報告内容.value[i].value.作業時間_分.error = formInfo.報告内容.fields.作業時間_分.label + 'は0より大きい値を入力してください';
                    hasError = true;
                }

                // カテゴリが選択されていないとき、エラーメッセージを表示
                if (!record.報告内容.value[i].value.カテゴリ.value) {
                    record.報告内容.value[i].value.カテゴリ.error = formInfo.報告内容.fields.カテゴリ.label + 'を選択してください';
                    hasError = true;
                }
            };

            // もし未入力がどこかにあればreturn
            if (hasError) return event;

            // 担当者が一人以上いるかを確認。
            if (tantoshaMei.length > 1) {
                record.担当者.error = formInfo.担当者.label + 'が複数人います'; // 担当者が複数人存在するとき,エラーを表示
                return event;
            }

            // レコードに登録された報告内容の回数を格納
            const torokuKaisu = record.報告内容.value.length;

            // それぞれの報告内容で一つでも0以下の作業時間があればエラーを表示
            for (let i = 0; i < torokuKaisu; i++) {
                let sagyoJikan = record.報告内容.value[i].value.作業時間_分.value;
                if (sagyoJikan < 0) {
                    // 作業時間が負の数字である場合、エラーを表示
                    record.報告内容.value[i].value.作業時間_分.error = formInfo.報告内容.fields.作業時間_分.label + 'を正しく入力してください';
                    hasError = true;
                }
            };

            if (hasError) return event;

            // 合計時間フィールドの数値が8時間を超えていればエラーを表示
            if (record.合計時間.value > kinmuJikan) {
                event.error = formInfo.合計時間.label + 'が8時間を超過しています。';
                return event;
            }

            // 担当者のログインID
            const tantoshaCode = record.担当者.value[0].code;

            let query = '';

            // 新規画面の場合
            if (event.type === 'app.record.create.submit') {
                // 担当者と作業日が重複するレコードを1件取得するためのクエリ
                query = '担当者 in ("' + tantoshaCode + '") and 作業日 = "' + sagyobi + '" limit 1';
            }

            // 編集画面の場合
            // else
            else {
                // 自身のレコード以外で、担当者と作業日が重複するレコードを1件取得するためのクエリ
                query = '担当者 in ("' + tantoshaCode + '") and 作業日 = "' + sagyobi + '" and $id != "' + recordId + '" limit 1';
            }

            // 担当者と作業日が重複するデータを格納する空のオブジェクト
            let recordData = {};

            // APIに指定するbody
            const body = {
                app: kintone.app.getId(),
                query: query,
                fields: ['担当者', '作業日']
            };

            // bodyに該当するレコードを取得
            recordData = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', body);

            // 担当者、作業日が同じものが既に登録されている場合、エラー表示
            if (recordData.records.length > 0) {
                event.error = record.担当者.value[0].name + 'と' + record.作業日.value + 'の組み合わせはすでに登録されています';
                return event;
            }

        } catch (err) {
            // イベントエラーを表示
            console.log(err);
            event.error = 'データの保存に失敗しました。';
        };

        return event;

    });
})();
