import Link from "next/link";

type PaymentLinkBannerProps = {
  paymentLink?: string | null;
  notice?: string;
  title?: string;
};

export function PaymentLinkBanner({
  paymentLink,
  notice,
  title = "Link de pagamento disponível",
}: PaymentLinkBannerProps) {
  if (!paymentLink) return null;

  return (
    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-emerald-800/80">
            Não armazenamos os dados do seu cartão. Use o link para pagar com cartão
            ou gerar o Pix.
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-md bg-emerald-600 px-3 py-1 text-white text-xs hover:bg-emerald-700"
            onClick={() => navigator.clipboard.writeText(paymentLink)}
          >
            Copiar link
          </button>
          <Link
            href={paymentLink}
            target="_blank"
            className="rounded-md border border-emerald-200 px-3 py-1 text-xs text-emerald-800 hover:bg-white"
          >
            Abrir
          </Link>
        </div>
      </div>
      <div className="rounded-lg bg-white px-3 py-2 text-xs font-mono text-emerald-900">
        {paymentLink}
      </div>
      {notice && (
        <div className="text-xs text-emerald-800/80">{notice}</div>
      )}
    </div>
  );
}
