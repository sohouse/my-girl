import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-20 text-[#201b18]">
      <p className="text-sm uppercase tracking-[0.24em] text-[#9b3933]">Payment canceled</p>
      <h1 className="mt-4 text-4xl font-semibold">支付已取消</h1>
      <p className="mt-4 text-base leading-8 text-[#6f625b]">
        你可以稍后再试一次，或者返回首页继续浏览角色。
      </p>
      <Link className="mt-8 inline-flex w-fit rounded-full bg-[#1d1917] px-5 py-3 text-sm font-medium text-[#fff7ec]" href="/">
        返回首页
      </Link>
    </main>
  );
}
