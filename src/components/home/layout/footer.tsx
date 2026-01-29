import Link from "next/link";
import { Twitter, Linkedin, Facebook, Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-background text-gray-400 py-16 border-t border-gray-900">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-12 lg:px-20">
        <div className="flex flex-col lg:flex-row justify-between gap-12 mb-20">
          {/* Logo and Description */}
          <div className="max-w-xs">
            <div className="mb-6">
              <span className="text-3xl font-jersey-10 tracking-[3px] font-bold text-foreground">
                SkillSphere
              </span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Top learning experiences that create more talent in the world.
            </p>
          </div>

          {/* Link Columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-24">
            <div>
              <h3 className="text-foreground text-sm font-semibold mb-6">Product</h3>
              <ul className="space-y-4">
                {["Overview", "Features", "Solutions", "Tutorials", "Pricing"].map((text) => (
                  <li key={text}>
                    <Link href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
                      {text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-white text-sm font-semibold mb-6">Company</h3>
              <ul className="space-y-4">
                {["About us", "Careers", "Press", "News"].map((text) => (
                  <li key={text}>
                    <Link href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
                      {text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-white text-sm font-semibold mb-6">Social</h3>
              <ul className="space-y-4">
                {["Twitter", "LinkedIn", "GitHub"].map((text) => (
                  <li key={text}>
                    <Link href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
                      {text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-white text-sm font-semibold mb-6">Legal</h3>
              <ul className="space-y-4">
                {["Terms", "Privacy", "Cookies", "Contact"].map((text) => (
                  <li key={text}>
                    <Link href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
                      {text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-gray-500">
            © 2025 SkillSphere. All rights reserved.
          </p>

          <div className="flex items-center space-x-6">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <Linkedin className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
