# Blegger

BLE デバイスからのデータを mongoDB へロギングする CLI ツールです。

## 用意するもの

- Docker 環境
- Node.js 環境（そのうち要らなくするかも）
- mongoDB Compase（データを閲覧するため）

## 使い方

1. 本リポジトリをお好きな場所へ Clone します。
2. ターミナルで本リポジトリ配下を開いてください
   1. `/blegger`に。以下ターミナル 1 と呼称します。
3. ターミナルで本リポジトリ配下の mongo フォルダを開いてください
   1. `/blegger/mongo`に。以下ターミナル 2 と呼称します。
4. ターミナル 1 で`npm install`します
5. ターミナル 2 で`docker compose up`します
   1. 古いバージョンを使っている方は`docker-compose up`
6. ターミナル 1 で以下のフォーマットに従い実行します
   1. `npm start -- --name="YOUR_DEVICE_LOCAL_NAME" --service="YOUR_SERVICE_UUID" --characteristics="YOUR_CHARACTERISTIC_UUID1" "YOUR_CHARACTERISTIC_UUID2" --columns="DATABASE_COLUMN1" "DATABASE_COLUMN2"`
   2. それぞれのオプションの詳細は次の節で
7. 正常に動作した場合は mongoDB Compass からデータを確認できるはずです

## コマンドのオプションについて

ここで説明することは`npm start -- --help`で見ることができるヘルプと同じ内容です。

- name オプション
  - name オプションは作成した BLE デバイスのローカルネームを指します。デバイスの識別に使っています。
  - 必須オプションです。String です。
- service オプション
  - service オプションはサービスの UUID を指定します。
  - 必須オプションです。String です。
- characteristics オプション
  - characteristics はキャラクタリスティックの UUID を指定します。
  - 必須オプションです。Array\<String\>です。配列で指定できます。columns オプションと指定した数が一致していなければなりません。
- columns オプション
  - columns オプションはデータベースに保存する際のコレクション名です。ひとつのキャラクタリスティックにつき、ひとつのコレクションの生成をイメージしています。
  - 必須オプションです。Array\<String\>です。配列で指定できます。characteristics オプションと指定した数が一致していなければなりません。

## デバイス側の実装方針

- notify を使います
- データは String を送信します
- 複数ある場合は`,`で繋げます（csv 形式）

```
data = data1 + "," + data2 + "," + data3
```

## 保存されるデータフォーマット

- JSON 文字列で保存されます
- key 要素は添字の値になります

```
{
    "0": data1,
    "1": data2,
    "2": data3
}
```

## 既知の問題点・懸念点

- どのくらいのレートで送信することができるのかの検証をしていないです
  - デバイス側で delay をかけないで送った場合にデータが欠落する恐れがあります
- ロガー側のデータベース保存処理を逐次的に動作させているためパフォーマンス的に良くない可能性が高いです
  - バッファに貯めて一括保存などの処理を挟むべきだと考えています
- せっかく docker 使っているのに node.js 環境が必要な状態は改善したいなと感じています。
