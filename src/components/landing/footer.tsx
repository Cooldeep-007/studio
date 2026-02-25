import Link from 'next/link';
import { Twitter, Linkedin, Facebook } from 'lucide-react';

const footerLinks = {
  company: [
    { href: '#', label: 'About' },
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#contact', label: 'Contact' },
  ],
  resources: [
    { href: '#', label: 'Help Center' },
    { href: '#', label: 'Blog' },
    { href: '#', label: 'Privacy Policy' },
    { href: '#', label: 'Terms of Service' },
  ],
};

const socialLinks = [
  { href: '#', icon: <Twitter className="h-5 w-5" /> },
  { href: '#', icon: <Linkedin className="h-5 w-5" /> },
  { href: '#', icon: <Facebook className="h-5 w-5" /> },
];

export function LandingFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              CORNER
            </Link>
            <p className="mt-4 text-gray-400">Smarter accounting for modern Indian businesses.</p>
          </div>
          <div className="lg:col-span-2">
            <h3 className="font-semibold text-white">Company</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.company.map(link => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-white transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-2">
            <h3 className="font-semibold text-white">Resources</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.resources.map(link => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-white transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} CORNER. All rights reserved.</p>
          <div className="flex gap-4 mt-4 sm:mt-0">
            {socialLinks.map((link, i) => (
              <Link key={i} href={link.href} className="text-gray-500 hover:text-white">
                {link.icon}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
