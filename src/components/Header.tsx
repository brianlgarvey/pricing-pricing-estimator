export function Header() {
  return (
    <header className="relative flex items-center border-b border-[#E5E7EB] bg-white px-4 py-3">
      <a href="https://profound.ly" target="_blank" rel="noopener noreferrer">
        <img
          src="https://profound.ly/hs-fs/hubfs/Graphics/Logo/White%20Background/fulllogo_transparent_nobuffer.png"
          alt="Profoundly"
          className="h-8"
        />
      </a>
      <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm">
        <a
          href="https://rfp-agent-brown.vercel.app"
          className="flex items-center gap-1.5 text-gray-400 transition-colors hover:text-gray-600"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[11px] leading-none text-gray-400">1</span>
          Brief
        </a>
        <div className="h-px w-6 bg-gray-300" />
        <span className="flex items-center gap-1.5 font-semibold text-gray-900">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[11px] leading-none text-white">2</span>
          Estimate
        </span>
        <div className="h-px w-6 bg-gray-300" />
        <a
          href="https://profound.ly/get-started?hsCtaAttrib=193271833768"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-gray-400 transition-colors hover:text-gray-600"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[11px] leading-none text-gray-400">3</span>
          Quote
        </a>
      </nav>
    </header>
  );
}
