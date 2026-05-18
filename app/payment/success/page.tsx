import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-20 text-[#201b18]">
      <p className="text-sm uppercase tracking-[0.24em] text-[#9b3933]">Payment successful</p>
      <h1 className="mt-4 text-4xl font-semibold">支付已完成</h1>
      <p className="mt-4 text-base leading-8 text-[#6f625b]">
        你的 Creem 测试支付已经完成。接下来我们会以 webhook 为准同步你的订单状态。
      </p>
      <Link className="mt-8 inline-flex w-fit rounded-full bg-[#1d1917] px-5 py-3 text-sm font-medium text-[#fff7ec]" href="/">
        返回首页
      </Link>
    </main>
  );
}
