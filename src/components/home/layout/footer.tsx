"use client";

import Link from "next/link";
import { Twitter, Linkedin, Facebook, Send } from "lucide-react";

export default function Footer() {
  return (
    <>
      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-xs">
        <div className="container mx-auto px-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <div>
            <div className="mb-4">
              <div className="flex items-center">
                <span className="text-3xl font-jersey-10 tracking-[3px] font-bold">
                  SkillSphere
                </span>
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
                ),
              )}
            </ul>
          </div>

          <div>
            <h3 className="uppercase text-xs font-semibold mb-4 text-gray-500">
              Social
            </h3>
            <ul className="space-y-2">
              {["Twitter", "LinkedIn", "Facebook", "GitHub"].map((text, j) => (
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
                ),
              )}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto px-8">
          <p className="text-xs text-gray-500">
            &copy; 2026 SkillSphere. All rights reserved.
          </p>

          {/* Social icons with lucide-react */}
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-white transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>

            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>

            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-white transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>

            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-white transition-colors"
              aria-label="Telegram"
            >
              <Send className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
