- [x] client component の初期データフェッチにuseEffect を利用しないでください。swrを入れたので、置き換えてください（useEffectの依存配列が[]のものは初期データフェッチかと思いますので、探して修正してください）
- [x] heatmap-canvas.tsxの実装ですが、濃さを逆にするのではなく、通行量が低い部分程opacityが高くなるようにしてほしいです。人が通っている部分は透過度をそのままにすることでラインが見えるように、通っていない部分は透過度を高くすることで、背景が見えるようにしてほしいです。
- [x] daily-bar-chartsのonSelectがきいていないようです。原因を分析して修正してください。（難しいようであればこちらで直すので教えてください）
- [x] rechartsの`cell`はdeprecatedとなっています。次のテキストを参照して修正してください
  ```text
  'Cell' is deprecated.ts(6385)
  Cell.d.ts(22, 4): The declaration was marked as deprecated here.
  (alias) const Cell: FunctionComponent<Props>
  import Cell
  Cell component used to define colors and styles of chart elements.

  This component is now deprecated and will be removed in Recharts 4.0.

  Please use the shape prop or content prop on the respective chart components to customize the rendering of chart elements instead of using Cell.

  @see — Guide: Migrate from Cell component to shape prop

  @deprecated

  @consumes — CellReader
  ```
- [x] pnpm lint でエラーが発生しているので、完了するまで修正を続けてください