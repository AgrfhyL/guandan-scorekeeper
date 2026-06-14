export function RulesPage() {
  return (
    <div className="px-4 pt-4 text-sm leading-relaxed text-gray-700">
      <h2 className="mb-2 text-lg font-semibold">掼蛋规则</h2>

      <h3 className="mt-3 font-medium">牌型大小</h3>
      <p>四王（天王炸）＞炸弹（≥6 张）＞同花顺＞5 张炸弹＞4 张炸弹＞其他牌型。</p>

      <h3 className="mt-3 font-medium">升级</h3>
      <ul className="list-disc pl-5">
        <li>双上（头游+二游）→ 升 3 级</li>
        <li>单上（头游+三游）→ 升 2 级</li>
        <li>单下（头游+末游）→ 升 1 级</li>
        <li>双下 → 对方升 3 级，己方不升</li>
      </ul>

      <h3 className="mt-3 font-medium">打 A（三次机会）</h3>
      <p>
        升到 A 后启动三次挑战。双上 / 单上过 A 即胜；单下不过 A（己方继续主打，再次挑战）；双下则对方升级。
        三次挑战 A3 仍失败则退回 2。
      </p>

      <h3 className="mt-3 font-medium">积分</h3>
      <p>
        胜方得分 = 52 + 4 ×（胜方级别 − 负方级别），负方得分 = 100 − 胜方得分。级别数字 2..K=2..13，A=14。
      </p>

      <h3 className="mt-3 font-medium">进贡 / 抗贡</h3>
      <p>
        每把结束后按排名进贡：单贡为末游→头游，双贡为整队→整队。进贡方持双大王可抗贡。抗贡次数记到进贡方所在队伍。
      </p>
    </div>
  )
}
