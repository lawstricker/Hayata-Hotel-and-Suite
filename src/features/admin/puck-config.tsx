import { migrate, type Config, type Data } from '@puckeditor/core'
import { ApartmentsView, CtaView, HeroView, PromiseView, RoomsView, StoryView, type ApartmentsProps, type CtaProps, type HeroProps, type PromiseProps, type RoomsProps, type StoryProps } from '@/features/admin/puck-components'
import { defaultHomepageContent } from '@/store/pageBuilderStore'

const iconOptions = ['Sparkles', 'Coffee', 'MapPin', 'ShieldCheck']

export const homeConfig = {
  components: {
    HeroSection: {
      label: 'Hero',
      render: (props: HeroProps) => <HeroView {...props} />,
      defaultProps: {
        eyebrow: defaultHomepageContent.hero.eyebrow, title: defaultHomepageContent.hero.title,
        description: defaultHomepageContent.hero.description, image: defaultHomepageContent.hero.image,
        primaryLabel: defaultHomepageContent.hero.primaryLabel, primaryHref: defaultHomepageContent.hero.primaryHref,
        secondaryLabel: defaultHomepageContent.hero.secondaryLabel, secondaryHref: defaultHomepageContent.hero.secondaryHref,
        scrollLabel: defaultHomepageContent.hero.scrollLabel,
      },
      fields: {
        eyebrow: { type: 'text' }, title: { type: 'text' }, description: { type: 'textarea' }, image: { type: 'text' },
        primaryLabel: { type: 'text' }, primaryHref: { type: 'text' }, secondaryLabel: { type: 'text' }, secondaryHref: { type: 'text' }, scrollLabel: { type: 'text' },
      },
    },
    PromiseStrip: {
      label: 'Highlights & booking',
      render: (props: PromiseProps) => <PromiseView {...props} />,
      defaultProps: {
        label1: defaultHomepageContent.promises[0].label, icon1: defaultHomepageContent.promises[0].icon,
        label2: defaultHomepageContent.promises[1].label, icon2: defaultHomepageContent.promises[1].icon,
        label3: defaultHomepageContent.promises[2].label, icon3: defaultHomepageContent.promises[2].icon,
        label4: defaultHomepageContent.promises[3].label, icon4: defaultHomepageContent.promises[3].icon,
      },
      fields: {
        label1: { type: 'text' }, icon1: { type: 'select', options: iconOptions.map((value) => ({ label: value, value })) },
        label2: { type: 'text' }, icon2: { type: 'select', options: iconOptions.map((value) => ({ label: value, value })) },
        label3: { type: 'text' }, icon3: { type: 'select', options: iconOptions.map((value) => ({ label: value, value })) },
        label4: { type: 'text' }, icon4: { type: 'select', options: iconOptions.map((value) => ({ label: value, value })) },
      },
    },
    RoomsIntro: {
      label: 'Rooms',
      render: (props: RoomsProps) => <RoomsView {...props} />,
      defaultProps: { eyebrow: defaultHomepageContent.rooms.eyebrow, titleLead: defaultHomepageContent.rooms.titleLead, titleAccent: defaultHomepageContent.rooms.titleAccent, description: defaultHomepageContent.rooms.description, linkLabel: defaultHomepageContent.rooms.linkLabel },
      fields: { eyebrow: { type: 'text' }, titleLead: { type: 'text' }, titleAccent: { type: 'text' }, description: { type: 'textarea' }, linkLabel: { type: 'text' } },
    },
    StoryBand: {
      label: 'Our story',
      render: (props: StoryProps) => <StoryView {...props} />,
      defaultProps: {
        eyebrow: defaultHomepageContent.story.eyebrow, title: defaultHomepageContent.story.title, description: defaultHomepageContent.story.description,
        image1: defaultHomepageContent.story.image1, image2: defaultHomepageContent.story.image2,
        value1: defaultHomepageContent.story.stats[0].value, suffix1: defaultHomepageContent.story.stats[0].suffix, label1: defaultHomepageContent.story.stats[0].label,
        value2: defaultHomepageContent.story.stats[1].value, suffix2: defaultHomepageContent.story.stats[1].suffix, label2: defaultHomepageContent.story.stats[1].label,
        value3: defaultHomepageContent.story.stats[2].value, suffix3: defaultHomepageContent.story.stats[2].suffix, label3: defaultHomepageContent.story.stats[2].label,
      },
      fields: {
        eyebrow: { type: 'text' }, title: { type: 'text' }, description: { type: 'textarea' }, image1: { type: 'text' }, image2: { type: 'text' },
        value1: { type: 'number' }, suffix1: { type: 'text' }, label1: { type: 'text' },
        value2: { type: 'number' }, suffix2: { type: 'text' }, label2: { type: 'text' },
        value3: { type: 'number' }, suffix3: { type: 'text' }, label3: { type: 'text' },
      },
    },
    ApartmentsIntro: {
      label: 'Apartments',
      render: (props: ApartmentsProps) => <ApartmentsView {...props} />,
      defaultProps: { eyebrow: defaultHomepageContent.apartments.eyebrow, titleLead: defaultHomepageContent.apartments.titleLead, titleAccent: defaultHomepageContent.apartments.titleAccent, description: defaultHomepageContent.apartments.description },
      fields: { eyebrow: { type: 'text' }, titleLead: { type: 'text' }, titleAccent: { type: 'text' }, description: { type: 'textarea' } },
    },
    CtaCard: {
      label: 'Call to action',
      render: (props: CtaProps) => <CtaView {...props} />,
      defaultProps: { title: defaultHomepageContent.cta.title, description: defaultHomepageContent.cta.description, buttonLabel: defaultHomepageContent.cta.buttonLabel, buttonHref: defaultHomepageContent.cta.buttonHref, recognition: defaultHomepageContent.recognition },
      fields: { title: { type: 'text' }, description: { type: 'textarea' }, buttonLabel: { type: 'text' }, buttonHref: { type: 'text' }, recognition: { type: 'text' } },
    },
  },
} as unknown as Config

function componentData(type: string, props: Record<string, unknown>, id: string) {
  return { type, props: { ...props, id } }
}

export const defaultHomeData: Data = migrate({
  root: { props: {} },
  content: [
    componentData('HeroSection', (homeConfig.components.HeroSection.defaultProps ?? {}) as Record<string, unknown>, 'HeroSection-1'),
    componentData('PromiseStrip', (homeConfig.components.PromiseStrip.defaultProps ?? {}) as Record<string, unknown>, 'PromiseStrip-1'),
    componentData('RoomsIntro', (homeConfig.components.RoomsIntro.defaultProps ?? {}) as Record<string, unknown>, 'RoomsIntro-1'),
    componentData('StoryBand', (homeConfig.components.StoryBand.defaultProps ?? {}) as Record<string, unknown>, 'StoryBand-1'),
    componentData('ApartmentsIntro', (homeConfig.components.ApartmentsIntro.defaultProps ?? {}) as Record<string, unknown>, 'ApartmentsIntro-1'),
    componentData('CtaCard', (homeConfig.components.CtaCard.defaultProps ?? {}) as Record<string, unknown>, 'CtaCard-1'),
  ],
} as Data, homeConfig)
