/**
 * @fileoverview 日報アプリ　日報検索機能
 *
 *【必要ライブラリ】
 * [JavaScript]
 * jquery.min.js -v3.7.1
 * kuc.min.js
 * gridjs.umd.js -v6.2.0
 *
 * [CSS]
 * jquery-ui.css -v1.12.1
 *
 * @author SNC
 * @version
 * @customer
 */

(function () {
    'use strict';

    // Kucライブラリのバージョンを指定
    const Kuc = Kucs['1.21.0'];

    /**
     * 画面（新規、編集、一覧編集）保存前のイベント
     * 担当者検索コードの更新
     */
    kintone.events.on([
        'app.record.index.show'
    ], async function (event) {
        const targetViewId = 5978648;
        if (event.viewId !== targetViewId) {
            event.error = '一覧画面が見つかりません';
            return event;
        }

        // 担当者選択用のドロップダウン
        const KucDropdown = new Kuc.Dropdown(
            {
                label: '担当者選択',  // コンポーネントの説明ラベル
                items: []  // ドロップダウンの選択肢一覧を入れる空箱
            }
        );

        // 作業開始日のカレンダー入力
        const KucSagyoKaishibi = new Kuc.DatePicker(
            {
                label: '作業開始日',  // コンポーネントの説明ラベル
                language: 'ja'  // 表示する言語(日本語)
            }
        );

        // 作業終了日のカレンダー入力
        const KucSagyoShuryobi = new Kuc.DatePicker(
            {
                label: '作業終了日',  // コンポーネントの説明ラベル
                language: 'ja'  // 表示する言語(日本語)
            }
        );

        // カテゴリ選択のチェックボックス
        const KucCheckbox = new Kuc.Checkbox(
            {
                label: 'カテゴリ選択',  // コンポーネントの説明ラベル
                items: []  // チェックボックスの選択一覧を入れる空箱
            }
        );

        // 検索のボタン
        const KucButton = new Kuc.Button(
            {
                text: '一括更新',  //ボタンに表示するテキスト
                type: 'submit',  // ボタンのデザインタイプ
            }
        );

        // クリアボタン
        const KucClearButton = new Kuc.Button(
            {
                text: 'クリア',
                type: 'normal'
            }
        );

        try {
            // cybozu.comのユーザー情報を取得(ドロップダウンの選択肢に使用)
            const userInfo = await getUsers();

            // 日報アプリのフォーム情報を取得
            const formInfo = await kintone.app.getFormFields();

            // カテゴリフィールドに設定されている項目一覧を取得
            const categoryIchiran = Object.values(formInfo.報告内容.fields.カテゴリ.options).map(option => option.label);

            // ドロップダウンに入れるユーザー情報を呼び出し
            // ドロップダウンリストにユーザー一覧をセット
            KucDropdown.items = setDropdownItems(userInfo);

            // チェックボックスに入れるカテゴリを呼び出し
            // チェックボックスにカテゴリ項目をセット
            KucCheckbox.items = setCheckboxItems(categoryIchiran);

            //　ユーザーを選択するドロップダウンを生成
            const $userDiv = $("#dropdown");
            if ($userDiv.length > 0) {
                $userDiv.append(KucDropdown);
            }

            // 作業開始日のカレンダーを生成
            const $sagyoKaishibiDiv = $("#fromData");
            if ($sagyoKaishibiDiv.length > 0) {
                $sagyoKaishibiDiv.append(KucSagyoKaishibi);
            }

            // 作業終了日のカレンダーを生成
            const $sagyoShuryobiDiv = $("#toData");
            if ($sagyoShuryobiDiv.length > 0) {
                $sagyoShuryobiDiv.append(KucSagyoShuryobi);
            }

            // カテゴリのチェックボックスを生成
            const $categoryDiv = $('#category');
            if ($categoryDiv.length > 0) {
                $categoryDiv.append(KucCheckbox);
            }
            // 検索ボタンを生成
            const $buttonDiv = $('#Button');
            if ($buttonDiv.length > 0) {
                $buttonDiv.append(KucButton);
            }

            // クリアボタンを生成
            const $clearButtonDiv = $('#ClearButton');
            if ($clearButtonDiv.length > 0) {
                $clearButtonDiv.append(KucClearButton);
            }
        } catch (err) {
            console.log(err);
            event.error = '画面表示に失敗しました。'
        }

        // stylesheetから編集

        // 検索ボタンを押下したのちの処理
        KucButton.addEventListener('click', async () => {
            try {
                // 日報アプリのフォーム情報を取得
                const formInfo = await kintone.app.getFormFields();

                // カテゴリフィールドに設定されている項目一覧を取得
                const categoryIchiran = Object.values(formInfo.報告内容.fields.カテゴリ.options).map(option => option.label);

                // 表示順設定アプリの取得する要素
                const hyojijunSetteiBody = {
                    app: 12,
                    query: 'order by 表示順 asc',
                    fields: ['担当者', '表示順']
                };

                // 表示順設定アプリからレコードを一括取得
                const hyojijunSettei = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', hyojijunSetteiBody);

                // それぞれ入力された値を格納
                const selectedUser = KucDropdown.value;
                const selectedSagyokaishibi = KucSagyoKaishibi.value;
                const selectedSagyoshuryobi = KucSagyoShuryobi.value;
                const selectedCategory = KucCheckbox.value;

                let queryParts = [];

                // 選択されているなら、担当者条件をクエリに追加(未選択なら条件なし)
                if (selectedUser) {
                    queryParts.push('担当者 in ("' + selectedUser + '")');
                }

                // 選択されているなら、作業日範囲条件をクエリに追加(未選択なら条件なし)
                if ((selectedSagyokaishibi) && (selectedSagyoshuryobi)) {
                    queryParts.push('作業日 >= "' + selectedSagyokaishibi + '" and 作業日 <= "' + selectedSagyoshuryobi + '"');
                }

                // 作業開始日しか取得していない場合、それ以降の情報を全取得するようクエリに追加
                if ((selectedSagyokaishibi) && (!selectedSagyoshuryobi)) {
                    queryParts.push('作業日 >= "' + selectedSagyokaishibi + '"');
                }

                // 作業終了日しか取得していない場合、それ以前の情報を全取得するようクエリに追加
                if ((!selectedSagyokaishibi) && (selectedSagyoshuryobi)) {
                    queryParts.push('作業日 <= "' + selectedSagyoshuryobi + '"');
                }

                let selectedCategoryQuery = '';
                // カテゴリが１つ以上選択された場合、クエリ形式に整形
                if (selectedCategory.length > 0) {
                    selectedCategoryQuery = selectedCategory.map(value => `${value}`).join('","');
                }

                // 選択されているなら、カテゴリ条件をクエリに追加(未選択なら条件なし)
                if (selectedCategoryQuery) {
                    queryParts.push('カテゴリ in ("' + selectedCategoryQuery + '")');
                }

                // クエリの結合
                const query = queryParts.join(' and ');

                // 日報アプリの取得する要素
                let params = {};

                // クエリが未選択でない場合はparamsに入れる
                if (query != "") {
                    params = {
                        app: 7,  // 対象アプリID
                        filterCond: query,  // 絞込クエリ
                        fields: ['担当者', '報告内容', '作業日', '合計時間'],  // 必要なフィールド
                        sortConds: [    // 取得するデータのソート条件
                            {
                                code: '担当者',
                                type: 'user',
                                sort: 'asc'
                            },
                            {
                                code: '作業日',
                                type: 'date',
                                sort: 'desc'
                            },
                        ]
                    };
                }

                // クエリが未選択であるとき、pramsに入れず検索条件に入れない
                else {
                    params = {
                        app: 7,  // 対象アプリID
                        fields: ['担当者', '報告内容', '作業日', '合計時間'],  // 必要なフィールド
                        sortConds: [   // 取得するデータのソート条件
                            {
                                code: '担当者',
                                type: 'user',
                                sort: 'asc'
                            },
                            {
                                code: '作業日',
                                type: 'date',
                                sort: 'desc'
                            }
                        ]
                    };
                    // offset:
                    // limit:
                }

                // レコードの一括取得の関数を呼び出し
                const recordData = await getRecords(params);

                // itemに取得したレコード一覧を格納
                let item = [];
                if (selectedCategory.length > 0) {
                    recordData.forEach((record) => {
                        for (let i = 0; i < record.報告内容.value.length; i++) {
                            const categoryValue = record.報告内容.value[i].value.カテゴリ.value;

                            // 選択されたカテゴリが含まれているかチェック
                            let isCategoryMatched = false;
                            isCategoryMatched = selectedCategory.includes(categoryValue);

                            // 報告内容テーブルのカテゴリがselectedCategoryを含むならitemにpush
                            if (isCategoryMatched) {
                                item.push({
                                    '担当者': record.担当者.value[0].name,
                                    'プロジェクトコード': record.報告内容.value[i].value.プロジェクトコード.value,
                                    'プロジェクト名': record.報告内容.value[i].value.プロジェクト名.value,
                                    'カテゴリ': categoryValue,
                                    '作業時間': record.報告内容.value[i].value.作業時間_分.value
                                });
                            }
                        };
                    });
                }

                else {
                    // カテゴリが未選択のものはすべてpush
                    recordData.forEach((record) => {
                        for (let i = 0; i < record.報告内容.value.length; i++) {
                            item.push({
                                '担当者': record.担当者.value[0].name,
                                'プロジェクトコード': record.報告内容.value[i].value.プロジェクトコード.value,
                                'プロジェクト名': record.報告内容.value[i].value.プロジェクト名.value,
                                'カテゴリ': record.報告内容.value[i].value.カテゴリ.value,
                                '作業時間': record.報告内容.value[i].value.作業時間_分.value
                            });
                        };
                    });
                }

                // itemの中から担当者とプロジェクトコード、カテゴリが同じものを取り除く
                const seen = new Set();
                const filteredItems = item.filter(obj => {
                    const key = obj.担当者 + ' - ' + obj.プロジェクトコード + ' - ' + obj.カテゴリ; // 担当者とプロジェクトコードが一意に決まるkyeを定義
                    if (seen.has(key)) return false; // keyの情報があればseenには同じものが入らない
                    seen.add(key); // keyの情報がなければseenにkeyを追加し、filteredItemsに情報を格納
                    return true;
                });

                filteredItems.forEach(filtered => {
                    let summaryTime = 0; // 合計時間を初期化

                    // item 配列全体をループして、担当者とプロジェクトコードが一致するものを集計
                    item.forEach(summary => {
                        if (summary.担当者 === filtered.担当者 && summary.プロジェクトコード === filtered.プロジェクトコード && summary.カテゴリ === filtered.カテゴリ) {
                            summaryTime += Number(summary.作業時間); // 一致する作業時間を合計
                        }
                    });

                    filtered.作業時間 = summaryTime; // 合計した時間を上書き

                    // カテゴリ順をfilterItemsに格納することでソートできるように
                    for (let categoryNumber = 0; categoryNumber < categoryIchiran.length; categoryNumber++) {
                        if (filtered.カテゴリ === categoryIchiran[categoryNumber]) filtered.カテゴリ順 = (categoryNumber + 1);
                    };
                });

                hyojijunSettei.records.forEach(element => {
                    const hyojijun = element.表示順.value; // アプリで設定した表示順をhyojijunに格納
                    filteredItems.forEach(filter => { // 一致すれば表示順をfilteredItemsに追加
                        if (filter.担当者 === element.担当者.value[0].name) filter.表示順 = hyojijun;
                    });
                });

                // プロジェクトで設定されたカテゴリので並び替え
                filteredItems.sort((a, b) => {
                    const hyojijunA = Number(a.表示順);
                    const hyojijunB = Number(b.表示順);
                    if (hyojijunA > hyojijunB) return 1;
                    if (hyojijunA < hyojijunB) return -1;

                    if (a.プロジェクトコード > b.プロジェクトコード) return 1;
                    if (a.プロジェクトコード < b.プロジェクトコード) return -1;

                    const categoryA = Number(a.カテゴリ順);
                    const categoryB = Number(b.カテゴリ順);
                    if (categoryA > categoryB) return 1;
                    if (categoryA < categoryB) return -1;
                });

                // もしテーブルが残っていた場合、そのテーブルを消す。
                if ($("Table").length > 0) $("#Table").remove();

                // レコードが1件もない場合、メッセージを表示。
                if (filteredItems.length === 0) {
                    const KucNotification = new Kuc.Notification(
                        {
                            content: 'レコードが見つかりませんでした。<br>検索条件を変えてもう一度検索し直してください。',
                            type: 'danger',
                            duration: 5000,
                            container: document.body
                        }
                    );
                    KucNotification.open();
                    return;
                }

                // 検索テーブル出力
                const tableDiv = $("<div/>");
                tableDiv.attr("id", "Table");
                $("body").append(tableDiv);

                //ソートされたデータをテーブル出力
                new gridjs.Grid({
                    //列の指定
                    columns: ['担当者', 'プロジェクトコード', 'プロジェクト名', 'カテゴリ', '作業時間'],
                    // 列に対して何を出力するか指定
                    data: filteredItems.map(record => [
                        record['担当者'],
                        record['プロジェクトコード'],
                        record['プロジェクト名'],
                        record['カテゴリ'],
                        record['作業時間']
                    ]),
                    pagination: true, // テーブルは一度にすべてぼデータは表示せず、残りのデータは他のページに分割される。
                    sort: true,  // 列ヘッダーをクリックすることでユーザーは任意の列を基準にデータを昇順または降順に並べ替えることができる。
                    search: false,  // 検索機能非搭載
                    language: {
                        pagination: {
                            previous: '前へ',  // 前のページに移動
                            next: '次へ',  // 次のページへ移動
                            showing: '表示中',
                            results: () => '件'  //全体で何件かを表示
                        }
                    }
                }).render(document.getElementById('Table'));

            } catch (err) {
                console.log('エラー:', err);
                console.log('エラー:', err.cause);

                // テーブルの初期化
                if ($("#Table").length > 0) $("#Table").remove();

                const tableDiv = $("<div/>");
                tableDiv.attr("id", "Table");
                $("body").append(tableDiv);

                new gridjs.Grid({
                    columns: ['担当者', 'プロジェクトコード', 'プロジェクト名', 'カテゴリ', '作業時間'],
                    data: [],
                    language: {
                        noRecordsFound: 'データの取得に失敗しました。',
                    }
                }).render(document.getElementById('Table'));
            };
        });

        // クリアボタンを押下したのちの処理
        KucClearButton.addEventListener('click', () => {
            try {
                // テーブルが存在する場合は削除
                if ($('#Table').length > 0) {
                    $('#Table').remove();
                }

                // すべての検索条件をクリア
                KucDropdown.value = '';        // 担当者選択をクリア
                KucSagyoKaishibi.value = '';   // 作業開始日をクリア
                KucSagyoShuryobi.value = '';   // 作業終了日をクリア
                KucCheckbox.value = [];        // カテゴリ選択をクリア
            } catch (err) {
                console.log('クリアエラー:', err);
            }
        });

        return event;
    });
})();

/**
 *cybozu.comに登録されたユーザー情報をKuc.Dropdown用の選択肢配列として整形する関数
 *
 * @param {object} usersData - cybozu.comに登録されたユーザー情報
 * @returns {Array} items - Kuc.Dropdownに渡す選択肢
 */
function setDropdownItems(usersData) {
    // 選択肢を格納する配列を用意。初期値は以下の通りに設定
    const items = [{ label: '-----', value: '' }];
    usersData.users.forEach((user) => {
        if (user.name != 'Administrator') {
            items.push({
                label: user.name,  // 表示ラベル。ユーザーの名前を表示
                value: user.code  // 渡される値。ユーザーのログインID
            });
        }
    });

    // 生成した選択肢の配列を返す
    return items;
};

/**
 *カテゴリフィールドに登録されたカテゴリの情報をKuc.Checkbox用の選択肢配列として整形する関数
 *
 * @param {object} category - kintoneフォーム情報のカテゴリフィールド
 * @returns {Array} items - Kuc.Checkboxに渡す選択肢
 */
function setCheckboxItems(category) {
    const items = []; // 選択肢を格納する配列を用意
    category.forEach((properties) => {
        items.push({
            label: properties,  // 表示ラベル
            value: properties  // 渡される値(今回はどちらも同じ)
        });
    });
    return items; // 生成した選択肢の配列を返す
};

/**
 * レコードID（レコード番号）の昇順でソートを行い、ID順にレコードを取得する。
 * @param {Object} _params
 * - app {String}: アプリID（省略時は表示中アプリ）
 * - filterCond {String}: 絞り込み条件
 * - sortConds {Array}: ソート条件の配列
 * - fields {Array}: 取得対象フィールドの配列
 * @returns {Object} response
 * - records {Array}: 取得レコードの配列
 *
 */
async function getRecords(_params) {
    const MAX_READ_LIMIT = 500;

    // 各パラメータの初期化
    const params = _params || {};
    const app = params.app || kintone.app.getId();
    const filterCond = params.filterCond;
    const sortConds = params.sortConds || [];
    const fields = params.fields;
    let data = params.data;

    // 取得したrecordを格納する配列を初期化
    // 最後に取得したレコードIDを格納するlastRecordIdを初期化
    if (!data) {
        data = {
            records: [],
            lastRecordId: 0
        };
    };

    // 絞込条件をconditionsに格納
    const conditions = [];
    const limit = MAX_READ_LIMIT;
    if (filterCond) {
        conditions.push(filterCond);
    };

    //　lastRecordIdより大きいレコードIDを取得する条件を追加
    conditions.push('$id > ' + data.lastRecordId);

    //　ソート、クエリの結合
    const sortCondsAndLimit =
        ` order by $id asc limit ${limit}`;
    const query = conditions.join(' and ') + sortCondsAndLimit;
    const body = {
        app: app,
        query: query
    };

    if (fields && fields.length > 0) {
        // $idで並び替えを行うため、取得フィールドに「$id」フィールドが含まれていなければ追加します
        if (fields.indexOf('$id') <= -1) {
            fields.push('$id');
        };
        body.fields = fields;
    };

    try {
        const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', body);
        data.records = data.records.concat(resp.records);
        if (resp.records.length === limit) {
            // 取得レコードの件数がlimitと同じ場合は、未取得のレコードが残っている場合があるので、getRecordsを再帰呼び出して、残りのレコードを取得します
            data.lastRecordId = resp.records[resp.records.length - 1].$id.value;
            return getRecords({ app: app, filterCond: filterCond, sortConds: sortConds, fields: fields, data: data });
        }

        // sortCondsが設定されている場合
        if (Array.isArray(sortConds) && sortConds.length > 0) {
            data.records.sort((a, b) => {
                for (let i = 0; i < sortConds.length; i++) {
                    let sortA = a[sortConds[i].code].value;
                    let sortB = b[sortConds[i].code].value;

                    switch (sortConds[i].type) {
                        case 'user':
                            sortA = a[sortConds[i].code].value[0].code;
                            sortB = b[sortConds[i].code].value[0].code;
                            break;
                        case 'number':
                            sortA = Number(sortA);
                            sortB = Number(sortB);
                            break;
                        case 'date':
                            sortA = new Date(sortA);
                            sortB = new Date(sortB);
                            break;
                    }

                    // 昇順であれば1を返し、そうでないとき(desc)であれば-1を返す
                    if (sortA > sortB) return sortConds[i].sort === 'asc' ? 1 : -1;

                    // 昇順であれば-1を返し、そうでないとき(desc)であれば1を返す
                    if (sortA < sortB) return sortConds[i].sort === 'asc' ? -1 : 1;

                };

                return 0;
            });
        }

        return data.records;
    } catch (err) {
        throw new Error("失敗", { cause: err });
    }
};

/**
 * リクエストパラメーターのoffsetを指定して順次レコードを取得する関数
 *
 * @param {Object} params
 *   - app {String}: アプリID（省略時は表示中アプリ）
 *   - filterCond {String}: 絞り込み条件
 *   - sortConds {Array}: ソート条件の配列
 *   - fields {Array}: 取得対象フィールドの配列
 * @return {Object} response
 *   - records {Array}: 取得レコードの配列
 */
async function getUsers(_params) {
    const MAX_READ_LIMIT = 100;

    const params = _params || {};
    const sortConds = params.sortConds;
    const size = params.size || -1;
    const offset = params.offset || 0;
    const fields = params.fields;
    let data = params.data;

    //  取得したrecordを格納する配列を初期化
    if (!data) {
        data = {
            users: []
        };
    };

    let willBeDone = false;
    let thisSize = MAX_READ_LIMIT;
    // getUsers関数の呼び出し側で、レコードの取得件数を指定された場合は
    // 取得件数を満たせば終了するようにwillBeDoneをtrueにする
    if (size > 0) {
        if (thisSize > size) {
            thisSize = size;
            willBeDone = true;
        };
    };

    // sortCondが存在するなら、ソートと制限値limitをクエリ文字列としてつなげる
    const sortCondsAndLimit = (sortConds && sortConds.length > 0 ? ' order by ' + sortConds.join(', ') : '') + ' size ' + thisSize;
    // クエリの結合
    const query = sortCondsAndLimit + ' offset ' + offset;
    const body = {
        query: query
    };
    // フィールド指定があればボディに入れる
    if (fields && fields.length > 0) {
        body.fields = fields;
    };
    // data.recordsにresp.recordsの内容を足していく
    const resp = await kintone.api(kintone.api.url('/v1/users.json', true), 'GET', body);
    data.users = data.users.concat(resp.users);
    const _offset = resp.users.length;
    if (size > 0 && size < _offset) {
        willBeDone = true;
    };
    // 取得すべきレコードを取得したら終了する
    if (_offset < thisSize || willBeDone) {
        return data;
    };
    // 取得すべきレコードが残っている場合は、再帰呼び出しで残りのレコードを取得する
    return getUsers({
        app: app,
        sortConds: sortConds,
        size: size - _offset,
        offset: offset + _offset,
        fields: fields,
        data: data
    });
};
