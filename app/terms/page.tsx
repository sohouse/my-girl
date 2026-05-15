import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "服务条款 | My Girl",
  description: "查看 My Girl 的服务使用规则、责任限制与用户义务。"
};

export default function TermsPage() {
  return (
    <LegalPage
      description="本服务条款描述了你使用 My Girl 服务时需要遵守的规则，以及我们双方的权利、义务和限制。"
      eyebrow="Terms of service"
      sections={[
        {
          title: "1. 服务说明",
          content: (
            <>
              <p>My Girl 提供基于角色设定的对话、记忆、语音、图片与分享等功能。服务内容可能会随着产品迭代而调整。</p>
            </>
          )
        },
        {
          title: "2. 账号与使用",
          content: (
            <>
              <p>你需要对自己的账号和行为负责。请确保提供的信息真实、合法，并妥善保管登录凭证，不要将账号借给他人使用。</p>
            </>
          )
        },
        {
          title: "3. 可接受使用",
          content: (
            <>
              <p>你不得利用本服务从事违法违规、侵权、骚扰、欺诈、入侵系统、传播恶意内容或其他会损害平台与他人权益的行为。</p>
              <p>如果你生成、上传或分享的内容违反适用法律或本条款，我们有权限制、暂停或终止相关功能。</p>
            </>
          )
        },
        {
          title: "4. 知识产权",
          content: (
            <>
              <p>平台上的软件、视觉设计、文案、品牌元素和系统功能受相关法律保护。未经许可，你不得复制、修改、分发或反向工程除你自身内容之外的平台资产。</p>
            </>
          )
        },
        {
          title: "5. 免责声明",
          content: (
            <>
              <p>服务按“现状”提供。我们会尽力保持稳定，但不保证服务完全无错误、不中断，也不对第三方服务的可用性、准确性或合规性作出额外承诺。</p>
            </>
          )
        },
        {
          title: "6. 责任限制",
          content: (
            <>
              <p>在法律允许的最大范围内，我们对因使用或无法使用服务而产生的间接损失、数据丢失、业务中断或其他衍生损害不承担责任。</p>
            </>
          )
        },
        {
          title: "7. 条款变更",
          content: (
            <>
              <p>我们可能会根据产品变化、法律要求或运营需要更新本条款。继续使用服务即表示你接受更新后的条款内容。</p>
            </>
          )
        }
      ]}
      title="服务条款"
      updatedAt="2026 年 5 月 15 日"
    />
  );
}
