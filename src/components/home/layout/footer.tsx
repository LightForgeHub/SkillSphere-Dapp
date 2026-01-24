import Link from "next/link";
import { Twitter, Linkedin, Facebook, Send } from "lucide-react"; // or wherever your icons are imported from

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="col-span-1 sm:col-span-2 md:col-span-1">
            <div className="mb-4">
              <span className="text-3xl font-jersey-10 tracking-[3px] font-bold text-white">
                SkillSphere
              </span>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed">
              Our learning system ensures that experts know what not to forget.
            </p>
          </div>

          <div>
            <h3 className="uppercase text-xs font-semibold mb-4 text-gray-400">
              Product
            </h3>
            <ul className="space-y-2">
              {[
                "Overview",
                "Features",
                "Solutions",
                "Tutorials",
                "Pricing",
              ].map((text, j) => (
                <li key={j}>
                  <Link
                    href="#"
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    {text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="uppercase text-xs font-semibold mb-4 text-gray-400">
              Company
            </h3>
            <ul className="space-y-2">
              {["About us", "Careers", "Press", "News", "Media"].map(
                (text, j) => (
                  <li key={j}>
                    <Link
                      href="#"
                      className="text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      {text}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>

          <div>
            <h3 className="uppercase text-xs font-semibold mb-4 text-gray-400">
              Social
            </h3>
            <ul className="space-y-2">
              {["X", "LinkedIn", "Facebook", "Telegram"].map((text, j) => (
                <li key={j}>
                  <Link
                    href="#"
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    {text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="uppercase text-xs font-semibold mb-4 text-gray-400">
              Legal
            </h3>
            <ul className="space-y-2">
              {["Terms", "Privacy", "Cookies", "Settings", "Contact"].map(
                (text, j) => (
                  <li key={j}>
                    <Link
                      href="#"
                      className="text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      {text}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            © 2026 SkillSphere. All rights reserved.
          </p>

          <div className="flex space-x-6 px-40">
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>

            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>

            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>

            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="Telegram"
            >
              <Send className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
