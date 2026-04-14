import Link from "next/link"
import Image from "next/image"
import { Facebook, Instagram, Mail, Phone } from "lucide-react"

function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.6 4c.5 1.7 1.6 3 3.4 3.4v2.8c-1.6-.1-2.9-.6-4.2-1.4v6.2c0 3.9-3.2 7-7.1 7-3.8 0-6.9-3.1-6.9-6.9 0-3.8 3.1-6.9 6.9-6.9.4 0 .8 0 1.2.1v3c-.4-.1-.7-.2-1.2-.2-2.1 0-3.9 1.7-3.9 3.9 0 2.1 1.8 3.9 3.9 3.9 2.2 0 4-1.8 4-4V4h3.9Z" />
    </svg>
  )
}

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M19.1 4.9A9.9 9.9 0 0 0 12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.2A9.9 9.9 0 0 0 12 22c5.5 0 10-4.5 10-10 0-2.7-1.1-5.2-2.9-7.1Zm-7.1 15.4c-1.5 0-2.9-.4-4.1-1.1l-.3-.2-3.1.7.7-3-.2-.3A7.9 7.9 0 0 1 4 12c0-4.4 3.6-8 8-8 2.1 0 4.1.8 5.7 2.3A7.9 7.9 0 0 1 20 12c0 4.4-3.6 8-8 8Zm4.5-6c-.2-.1-1.3-.7-1.5-.8-.2-.1-.4-.1-.6.1l-.9 1.1c-.2.2-.3.2-.6.1-.2-.1-.9-.3-1.7-1-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.2.1-.3.2-.5.1-.2 0-.4 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.8-.9 2s.9 2.3 1 2.4c.1.1 1.7 2.7 4.1 3.7.6.3 1 .4 1.4.5.6.2 1.1.2 1.5.2.5 0 1.3-.5 1.5-1 .2-.5.2-1 .1-1.1-.1-.1-.2-.1-.4-.2Z" />
    </svg>
  )
}

export function Footer() {
  const currentYear = new Date().getFullYear()

  const socialLinks = [
    {
      label: "Facebook",
      href: "https://www.facebook.com/profile.php?id=61586427994479",
      icon: Facebook,
    },
    {
      label: "Instagram",
      href: "https://www.instagram.com/brownmovies?igsh=NWh2aHdtdDRtcDF5",
      icon: Instagram,
    },
    {
      label: "TikTok",
      href: "https://www.tiktok.com/@breezy.movies3?_r=1&_t=ZS-95ScpSviVHA",
      icon: TikTokIcon,
    },
    {
      label: "WhatsApp",
      href: "https://wa.me/255692438585",
      icon: WhatsAppIcon,
    },
  ]

  const developerMessage = encodeURIComponent("Greetings, I need a website design service for my business. I saw your profile and would like to discuss your services.")
  const developerWhatsAppHref = `https://wa.me/255692438585?text=${developerMessage}`

  return (
    <footer className="bg-card/50 border-t border-border mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div>
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-orange/30">
                <Image 
                  src="/logo.png" 
                  alt="Brown Movies" 
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <span className="text-xl font-bold text-gradient">Brown Movies</span>
                <p className="text-xs text-muted-foreground">Premium Entertainment</p>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm mb-4">
              Burudani popote pale - Download movies, series, na katuni kwa bei nafuu.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-orange hover:bg-secondary/80 transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-foreground font-semibold mb-4">Wasiliana Nasi</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-muted-foreground text-sm">
                <Phone className="w-4 h-4 text-orange" />
                +255762873735
              </li>
              <li className="flex items-center gap-3 text-muted-foreground text-sm">
                <Mail className="w-4 h-4 text-orange" />
                info@brownmovies.co.tz
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center border-t border-border pt-8">
          <p className="text-muted-foreground text-sm">
            &copy; {currentYear} Brown Movies. Haki zote zimehifadhiwa.
          </p>
          <a
            href={developerWhatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center gap-2 footer-credit-wrap transition-opacity hover:opacity-90"
            aria-label="Message Brother_Qonteh on WhatsApp"
          >
            <span className="footer-credit-dot" aria-hidden="true" />
            <span className="footer-credit-text">Developed by Brother_Qonteh</span>
            <span className="footer-credit-dot" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  )
}
