"use client";
import Link from "next/link";

export default function Footer () {
    return(
        <>
         {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-xs">
        <div className="container mx-auto px-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <div>
            <div className="mb-4">
              <div className="h-8 w-8 bg-gray-800 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-teal-500 rounded-full"></div>
              </div>
            </div>
            <p className="text-gray-500 text-xs mb-2">
              Our learning system ensures that experts know
            </p>
            <p className="text-gray-500 text-xs">what not to forget.</p>
          </div>

          <div>
            <h3 className="uppercase text-xs font-semibold mb-4 text-gray-500">
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
                  <Link href="#" className="hover:text-white text-xs">
                    {text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="uppercase text-xs font-semibold mb-4 text-gray-500">
              Company
            </h3>
            <ul className="space-y-2">
              {["About us", "Careers", "Press", "News", "Media"].map(
                (text, j) => (
                  <li key={j}>
                    <Link href="#" className="hover:text-white text-xs">
                      {text}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h3 className="uppercase text-xs font-semibold mb-4 text-gray-500">
              Social
            </h3>
            <ul className="space-y-2">
              {["Twitter", "LinkedIn", "Facebook", "GitHub"].map(
                (text, j) => (
                  <li key={j}>
                    <Link href="#" className="hover:text-white text-xs">
                      {text}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h3 className="uppercase text-xs font-semibold mb-4 text-gray-500">
              Legal
            </h3>
            <ul className="space-y-2">
              {["Terms", "Privacy", "Cookies", "Settings", "Contact"].map(
                (text, j) => (
                  <li key={j}>
                    <Link href="#" className="hover:text-white text-xs">
                      {text}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto px-8">
          <p className="text-xs text-gray-500">
            © 2023 DAppName. All rights reserved.
          </p>
          <div className="flex space-x-3 mt-4 md:mt-0">
            {["Twitter", "GitHub", "LinkedIn", "Discord"].map((platform, i) => (
              <a
                key={i}
                href="#"
                className="text-gray-600 hover:text-white"
                aria-label={platform}
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </footer>
        </>
    );
}