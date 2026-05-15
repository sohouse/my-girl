import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "免责声明 | My Girl",
  description: "查看 My Girl 关于内容生成、第三方服务和使用风险的免责声明。"
};

export default function DisclaimerPage() {
  return (
    <LegalPage
      description="本免责声明用于说明 My Girl 在内容生成、服务稳定性和第三方依赖方面的边界。"
      eyebrow="Disclaimer"
      sections={[
        {
          title: "1. AI 生成内容",
          content: (
            <>
              <p>My Girl 的回复、图片、语音与推荐内容可能包含不准确、过时或不完整的信息。请将这些结果视为辅助性内容，不要直接作为专业判断依据。</p>
            </>
          )
        },
        {
          title: "2. 非专业建议",
          content: (
            <>
              <p>平台提供的内容不构成法律、医疗、金融、心理或其他专业建议。如需处理重要事项，请咨询合格的专业人士。</p>
            </>
          )
        },
        {
          title: "3. 第三方服务",
          content: (
            <>
              <p>部分功能依赖第三方云服务、模型服务、消息服务或存储服务。对于第三方的可用性、速度、准确性和政策变化，我们无法单独保证。</p>
            </>
          )
        },
        {
          title: "4. 服务中断与调整",
          content: (
            <>
              <p>我们可能因维护、升级、合规要求或不可抗力临时中断、限制或修改部分功能。我们会尽量减少影响，但无法承诺服务永远可用。</p>
            </>
          )
        },
        {
          title: "5. 用户责任",
          content: (
            <>
              <p>你需要自行判断并承担使用平台内容的后果。对外分享、保存或使用生成结果前，请自行核实其适用性与风险。</p>
            </>
          )
        }
      ]}
      title="免责声明"
      updatedAt="2026 年 5 月 15 日"
    />
  );
}
