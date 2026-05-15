import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircleMore, ShieldAlert } from "lucide-react";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "联系我们 | My Girl",
  description: "通过邮箱联系 My Girl 团队，反馈问题、申请帮助或提出合作建议。"
};

export default function ContactPage() {
  const contactEmail = process.env.RESEND_FROM_EMAIL ?? "support@mygirl.app";

  return (
    <LegalPage
      description="如果你在使用 My Girl 的过程中遇到问题、需要数据相关协助，或者有合作建议，都可以通过下面的方式联系我们。"
      eyebrow="Contact us"
      sections={[
        {
          title: "1. 联系方式",
          content: (
            <>
              <p>
                电子邮件：
                <Link className="ml-1 text-[#9b3933] underline decoration-[#d8a29e] underline-offset-4" href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </Link>
              </p>
              <p>我们会尽量在合理时间内回复。涉及账号、隐私或支付相关的问题，请尽量附上必要的上下文，方便我们快速处理。</p>
            </>
          )
        },
        {
          title: "2. 你可以联系我做什么",
          content: (
            <>
              <p>可以反馈产品问题、功能建议、账号异常、数据访问或删除请求，也可以询问合作、授权与商务相关事宜。</p>
              <p>如果是紧急安全问题，请在邮件标题中标注“安全问题”，我们会优先处理。</p>
            </>
          )
        },
        {
          title: "3. 我们会如何处理",
          content: (
            <>
              <p>收到消息后，我们会先判断问题类别，再决定是直接回复、转交处理，还是要求你补充必要信息。为了保护你的账号安全，我们可能会在回复前做简单验证。</p>
            </>
          )
        },
        {
          title: "4. 其他提醒",
          content: (
            <>
              <p>不要在非加密渠道发送不必要的敏感信息。若问题涉及隐私、删除或导出数据，建议使用与你账号一致的邮箱联系。</p>
            </>
          )
        }
      ]}
      title="联系我们"
      updatedAt="2026 年 5 月 15 日"
    />
  );
}
