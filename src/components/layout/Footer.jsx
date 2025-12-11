import React from 'react';
import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Github, 
  Twitter, 
  Mail,
  ExternalLink,
  Shield,
  Lock
} from 'lucide-react';

/**
 * Footer Component
 * Site footer with links and information
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Platform',
      links: [
        { label: 'Browse Hackathons', href: '/' },
        { label: 'Create Hackathon', href: '/create' },
        { label: 'Judge Dashboard', href: '/judge' },
        { label: 'Results', href: '/results' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', href: 'https://docs.zama.ai', external: true },
        { label: 'FHEVM Guide', href: 'https://docs.zama.ai/fhevm', external: true },
        { label: 'GitHub', href: 'https://github.com/zama-ai', external: true },
        { label: 'Discord', href: 'https://discord.com/invite/zama', external: true },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Code of Conduct', href: '/conduct' },
      ],
    },
  ];

  return (
    <footer className="w-full border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-4">
            
            <p className="text-sm text-muted-foreground max-w-sm">
              Decentralized hackathon platform powered by FHEVM. Encrypted submissions, fair judging, and trustless winner selection.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Secured by Fully Homomorphic Encryption</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Powered by Zama FHEVM v0.9</span>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            {currentYear} Zackathon. Built with FHEVM.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              asChild
            >
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              asChild
            >
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              asChild
            >
              <a
                href="mailto:contact@zackathon.com"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        
      </div>
    </footer>
  );
}

export default Footer;