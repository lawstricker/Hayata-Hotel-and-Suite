import type { SeoSettings } from '@/store/seoStore'

export interface PageMeta {
  title: string
  description: string
  path: string
}

const pageCopy: Record<string, { title: string; description: string }> = {
  '/': { title: 'Stay beautifully', description: 'Rooms, apartments and considered dining in a quiet corner of the city. Book your stay at Hayata Hotel & Suite.' },
  '/rooms': { title: 'Rooms & suites', description: 'Explore thoughtfully designed rooms and suites with light, quiet and a genuinely good night’s sleep.' },
  '/apartments': { title: 'Serviced apartments', description: 'When a night turns into a week, our apartments give you room to live well.' },
  '/amenities': { title: 'Amenities', description: 'Discover the dining, wellness and service amenities available during your stay at Hayata.' },
  '/dining': { title: 'Dining', description: 'All-day dining, considered menus and in-room dining from the Hayata kitchen and bar.' },
  '/gallery': { title: 'Gallery', description: 'A visual tour of the rooms, suites, restaurants and public spaces at Hayata Hotel & Suite.' },
  '/about': { title: 'About us', description: 'Learn about Hayata Hotel & Suite, our address and the details that make a stay feel effortless.' },
  '/contact': { title: 'Contact', description: 'Contact Hayata Hotel & Suite for reservations, events and guest support.' },
  '/legal/privacy': { title: 'Privacy policy', description: 'How Hayata Hotel & Suite handles guest information and booking data.' },
  '/legal/terms': { title: 'Terms & conditions', description: 'Booking terms,stay policies and conditions of stay at Hayata Hotel & Suite.' },
}

const humanize = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())

export function resolvePageMeta(pathname: string, settings: SeoSettings): PageMeta {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  let copy = pageCopy[path]
  if (!copy && path.startsWith('/rooms/')) copy = { title: `${humanize(path.split('/').pop() ?? 'Room')}`, description: `View details, rates and availability for ${humanize(path.split('/').pop() ?? 'this room')} at Hayata Hotel & Suite.` }
  if (!copy && path.startsWith('/apartments/')) copy = { title: `${humanize(path.split('/').pop() ?? 'Apartment')}`, description: `View details, rates and availability for ${humanize(path.split('/').pop() ?? 'this apartment')} at Hayata Hotel & Suite.` }
  if (!copy && path.startsWith('/booking')) copy = { title: 'Book your stay', description: 'Check live availability and complete your reservation in a few calm steps.' }
  if (!copy && path.startsWith('/manage-booking')) copy = { title: 'Manage your booking', description: 'Look up, confirm or cancel an existing Hayata Hotel & Suite reservation.' }
  if (!copy) return { title: settings.defaultTitle, description: settings.description, path }
  const title = path === '/' ? settings.defaultTitle : `${copy.title} | ${settings.siteName}`
  return { title, description: copy.description, path }
}

function canonicalUrl(baseUrl: string, path: string) {
  const cleanBase = baseUrl.replace(/\/$/, '')
  return path === '/' ? `${cleanBase}/` : `${cleanBase}${path}`
}

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[data-seo="true"][${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    element.dataset.seo = 'true'
    document.head.appendChild(element)
  }
  element.content = content
}

function removeMeta(attribute: 'name' | 'property', key: string) {
  document.head.querySelectorAll(`meta[data-seo="true"][${attribute}="${key}"]`).forEach((element) => element.remove())
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[data-seo="true"][rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.rel = rel
    element.dataset.seo = 'true'
    document.head.appendChild(element)
  }
  element.href = href
}

export function buildStructuredData(settings: SeoSettings) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Hotel',
        '@id': `${canonicalUrl(settings.canonicalBaseUrl, '/')}#hotel`,
        name: settings.hotel.name,
        description: settings.description,
        url: settings.canonicalBaseUrl,
        image: settings.ogImage,
        telephone: settings.hotel.telephone,
        priceRange: settings.hotel.priceRange,
        address: { '@type': 'PostalAddress', streetAddress: settings.hotel.address },
      },
      {
        '@type': 'WebSite',
        '@id': `${canonicalUrl(settings.canonicalBaseUrl, '/')}#website`,
        url: settings.canonicalBaseUrl,
        name: settings.siteName,
        inLanguage: settings.locale.replace('_', '-'),
        publisher: { '@id': `${canonicalUrl(settings.canonicalBaseUrl, '/')}#hotel` },
      },
    ],
  }
}

/** Writes route-aware metadata into document.head so crawlers and social previews see it. */
export function applySeo(meta: PageMeta, settings: SeoSettings, indexable: boolean) {
  document.title = meta.title
  document.documentElement.lang = settings.locale.replace('_', '-')
  const url = canonicalUrl(settings.canonicalBaseUrl, meta.path)

  setMeta('name', 'description', meta.description)
  setMeta('name', 'keywords', settings.keywords)
  setMeta('name', 'robots', indexable && settings.indexEnabled ? 'index, follow, max-image-preview:large, max-snippet:-1' : 'noindex, nofollow')
  setMeta('name', 'theme-color', settings.themeColor)
  setLink('canonical', url)

  setMeta('property', 'og:title', meta.title)
  setMeta('property', 'og:description', meta.description)
  setMeta('property', 'og:type', 'website')
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:image', settings.ogImage)
  setMeta('property', 'og:site_name', settings.siteName)
  setMeta('property', 'og:locale', settings.locale)

  setMeta('name', 'twitter:card', 'summary_large_image')
  setMeta('name', 'twitter:title', meta.title)
  setMeta('name', 'twitter:description', meta.description)
  setMeta('name', 'twitter:image', settings.ogImage)
  if (settings.twitterHandle) setMeta('name', 'twitter:site', settings.twitterHandle)
  else removeMeta('name', 'twitter:site')

  if (settings.googleVerification) setMeta('name', 'google-site-verification', settings.googleVerification)
  else removeMeta('name', 'google-site-verification')
  if (settings.bingVerification) setMeta('name', 'msvalidate.01', settings.bingVerification)
  else removeMeta('name', 'msvalidate.01')

  let script = document.getElementById('hayata-structured-data') as HTMLScriptElement | null
  if (!script) {
    script = document.createElement('script')
    script.id = 'hayata-structured-data'
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }
  script.textContent = JSON.stringify(buildStructuredData(settings))
}
