import { teamAuthor, teamReviewer, type GuideArticle } from './guide-shared';

/**
 * Work-from-home speed guide. Vendor figures were read from Zoom, Microsoft and Netflix
 * pages in October 2026; the CRTC and CRA points come from their own pages. Plan prices
 * mirror the internet catalogue (docs/LAUNCH_PLANS.md, table A).
 */
export const workFromHomeSpeedGuide: GuideArticle = {
  previewOnly: true,
  slug: 'internet-speed-for-working-from-home-canada',
  title: 'How much internet speed to work from home in Canada (2026)',
  breadcrumbTitle: 'Internet speed for working from home',
  category: 'Home internet',
  description:
    'How many Mbps you need to work from home in Canada. Download, upload and latency for Zoom, Teams, VPN and cloud files, a speed guide by household, and the CRA internet claim.',
  author: teamAuthor,
  reviewer: teamReviewer,
  updated: '2026-10-24',
  updatedLabel: 'Updated 24 Oct 2026',
  readingLabel: '8 min read · Figures checked October 2026',
  imageCaption: 'Person on a video call at a home desk next to a WiFi router',
  quickAnswer:
    'Most people working from home in Canada are fine with about 100 Mbps download and 10 to 20 Mbps upload. That covers video calls, a work VPN and cloud files for one person. Plan for 300 to 500 Mbps if two people work from home or the house streams and games at the same time, and 1 Gbps if you move big files. Upload speed and a steady connection matter more than the biggest number on the plan.',
  blocks: [
    {
      kind: 'section',
      id: 'three-numbers',
      title: 'Three numbers decide how working from home feels',
      text: 'Download is how fast things reach you: web pages, files and other people’s video. Upload is how fast you send things out: your own camera and microphone, screen sharing and files you save to the cloud. Latency, shown as ping in a speed test, is the delay in milliseconds between sending something and getting a reply. A video call uses all three at once. Plans are sold on download speed alone, which is why a fast plan can still give you a choppy call.',
    },
    {
      kind: 'table',
      id: 'what-work-needs',
      compact: true,
      title: 'How much speed does each work task use?',
      caption: 'Typical bandwidth per person for common work tasks, checked October 2026',
      columns: ['Task', 'Download', 'Upload'],
      rows: [
        { label: 'Voice call only', values: ['0.06 to 0.08 Mbps', '0.06 to 0.08 Mbps'] },
        { label: 'Zoom group call, 720p', values: ['1.8 Mbps', '2.6 Mbps'] },
        { label: 'Zoom group call, 1080p', values: ['3.0 Mbps', '3.8 Mbps'] },
        { label: 'Teams meeting, recommended', values: ['4 Mbps', '2.5 Mbps'] },
        { label: 'Screen sharing', values: ['0.05 to 2.5 Mbps', '0.05 to 2.5 Mbps'] },
        { label: 'Someone streaming 1080p video', values: ['5 Mbps', 'Almost none'] },
        { label: 'Someone streaming 4K video', values: ['15 Mbps', 'Almost none'] },
        {
          label: 'Saving a large file to the cloud',
          values: ['Light', 'Uses all the upload you have'],
        },
      ],
      note: 'Zoom, Microsoft and Netflix publish these per person or per device. Your connection carries everyone’s at once. Email, chat and web apps such as Google Docs use very little by comparison.',
    },
    {
      kind: 'section',
      id: 'add-up',
      title: 'Why the plan is bigger than the sum of the tasks',
      text: 'Add up one house. You are on a 1080p call, your partner is on another, a child is watching 4K video and your laptop starts a cloud backup. That is about 25 Mbps down and 8 Mbps up before the backup, which any modern plan covers. The pinch is upload, because every outgoing video stream and the backup squeeze through the same narrow pipe. A bigger plan feels relaxed because it leaves headroom, so nobody’s video freezes when someone else starts something large.',
    },
    {
      kind: 'table',
      id: 'upload-times',
      compact: true,
      title: 'How long does a big upload take?',
      caption: 'Time to upload a file at different upload speeds, before overhead',
      columns: ['Upload speed', '1 GB file', '10 GB file'],
      rows: [
        { label: '10 Mbps', values: ['13 min 20 s', '2 h 13 min'] },
        { label: '20 Mbps', values: ['6 min 40 s', '1 h 7 min'] },
        { label: '50 Mbps', values: ['2 min 40 s', '27 min'] },
        { label: '100 Mbps', values: ['1 min 20 s', '13 min 20 s'] },
        { label: '500 Mbps', values: ['16 s', '2 min 40 s'] },
      ],
      note: 'Worked out with 1 GB as 8,000 megabits. Real transfers add some overhead, so expect a little longer.',
    },
    {
      kind: 'section',
      id: 'upload-canada',
      title: 'Upload speed is where Canadian plans differ most',
      text: 'Plans in Canada are advertised by download speed. Upload depends on the technology behind the plan. Cable plans often upload at a small fraction of their download speed, and fibre plans are often symmetrical, meaning upload matches download. Ookla’s Speedtest data for May 2026, as reported by ISPreview, puts the Canadian median fixed connection at about 273 Mbps down and 101 Mbps up, so many homes already get good upload. Before you sign with any provider, ask for the upload speed at your exact address. With Canadian Plans, your advisor confirms availability at your address on the call, so ask for the upload speed then.',
    },
    {
      kind: 'table',
      id: 'by-household',
      title: 'Which speed fits which home?',
      caption: 'Rule of thumb for working from home, by household',
      columns: ['Your home', 'Download speed', 'Why'],
      rows: [
        {
          label: 'One person, calls and cloud work, little streaming',
          values: ['About 100 Mbps', 'Covers HD calls with room to spare'],
        },
        {
          label: 'Two people working from home, or one worker and a streamer',
          values: ['300 to 500 Mbps', 'Two calls and a stream at once'],
        },
        {
          label: 'Family of four or more, two workers, gaming, many devices',
          values: ['500 Mbps to 1 Gbps', 'Headroom for busy evenings and school'],
        },
        {
          label: 'Large uploads such as video, design or photos, or three or more workers',
          values: ['1 Gbps or more', 'Big files finish faster, if upload is high too'],
        },
      ],
      note: 'These are rules of thumb. Upload speed, Wi-Fi quality and a steady connection matter as much as the number.',
    },
    {
      kind: 'section',
      id: 'wifi-first',
      title: 'Check your Wi-Fi before you pay for more speed',
      text: 'A plan can deliver full speed to your modem and still arrive weak at a laptop in the back bedroom. Walls, distance, a crowded Wi-Fi channel and an older laptop all slow it down. If calls freeze but a speed test next to the router looks fine, a faster plan will not fix it.',
    },
    {
      kind: 'steps',
      id: 'test-steps',
      title: 'A 10-minute test before you upgrade',
      items: [
        'Run a speed test, such as speedtest.net or fast.com, on your work device standing next to the router. Write down download, upload and ping.',
        'Run it again at your desk. A big drop means Wi-Fi coverage is the problem, not your plan.',
        'Plug the work laptop into the router with an Ethernet cable and test again. If calls are clean on the cable, move the router or add a mesh system before you buy a faster plan.',
        'Test in your worst hour, such as a weekday evening when everyone is home. Note whether ping rises above about 100 ms or the speed halves.',
        'Test with your work VPN on and off. If the VPN is the slow part, a faster plan will not help. Microsoft recommends that employers let Teams traffic bypass the VPN, so ask your IT team about split tunnelling.',
      ],
    },
    {
      kind: 'tip',
      label: 'Best free upgrade',
      text: 'One Ethernet cable from the router to your work laptop beats most Wi-Fi fixes. It removes interference and gives a steadier ping, which is what keeps a video call smooth.',
    },
    {
      kind: 'section',
      id: 'data',
      title: 'How much data does working from home use?',
      text: 'A one-hour 1080p group call at Zoom’s top settings moves about 1.4 GB down and 1.7 GB up, around 3 GB in total. Four hours of calls a day over 20 working days is up to about 240 GB a month, before streaming, updates and backups. Zoom and Teams use less when the picture is smaller, but the sums show why an unlimited plan suits remote work. Every Canadian Plans home internet plan has unlimited data.',
    },
    {
      kind: 'section',
      id: 'crtc',
      title: 'What Canada’s regulator calls fast enough',
      text: 'In 2016 the CRTC set a national target that homes and businesses should be able to get at least 50 Mbps download and 10 Mbps upload, with an unlimited data option (Telecom Regulatory Policy 2016-496). It is a target for availability, not a rule that every plan must be that fast, and the CRTC says rural, remote and First Nations communities are still catching up. For one person on calls, 50 and 10 does the job. It leaves little room once a second person joins in, which is why we suggest more for shared homes.',
    },
    {
      kind: 'section',
      id: 'tax',
      title: 'Can you claim your internet bill when you work from home?',
      text: 'If you are an employee and your employer requires you to work from home, the Canada Revenue Agency lets you claim part of your costs using the detailed method, including reasonable monthly home internet fees. You need a signed Form T2200 from your employer, you file Form T777, and the total goes on line 22900. You normally must work from home more than half the time for at least four weeks in a row. The temporary $2-a-day flat rate ended after the 2022 tax year. You can claim only the work share of your home costs, and the CRA does not allow modem or router rental or connection fees. Our plans include the router and modem with no rental fee, so there is nothing to subtract. This is general information, not tax advice. Check the CRA guide or ask an accountant.',
    },
    {
      kind: 'table',
      id: 'our-plans',
      title: 'Home internet plans that suit working from home',
      caption: 'Canadian Plans home internet, October 2026, CAD per month before tax',
      columns: ['Province', 'Plans and prices', 'Good fit for'],
      rows: [
        {
          label: 'Saskatchewan',
          values: [
            '1 Gbps $50 or 2 Gbps $60',
            'Two or more workers or heavy uploads. First two months free.',
          ],
        },
        {
          label: 'British Columbia',
          values: [
            '500 Mbps $70 or 1 Gbps $80',
            '500 Mbps for one or two workers, 1 Gbps for a busy home',
          ],
        },
        {
          label: 'Alberta',
          values: [
            '500 Mbps $70 or 1 Gbps $80',
            '500 Mbps for one or two workers, 1 Gbps for a busy home',
          ],
        },
        {
          label: 'Manitoba',
          values: [
            '500 Mbps $90 or 2 Gbps $100',
            '500 Mbps for one or two workers, 2 Gbps for large homes',
          ],
        },
      ],
      note: 'Every plan: unlimited data, WiFi router and modem included, free professional installation, no upfront payment. BC, Alberta and Manitoba have a 2-year price lock. Upload speed depends on the provider and your address, so ask your advisor.',
    },
    {
      kind: 'plan-cta',
      eyebrow: 'Working from home?',
      text: 'Unlimited home internet from $50/mo, free install, nothing paid online',
      mobileLines: ['Unlimited internet from $50/mo', 'Free install, nothing paid online'],
      label: 'See home internet plans →',
      href: '/home-internet',
    },
    {
      kind: 'section',
      id: 'elsewhere',
      title: 'Living outside these four provinces, or in a rural area?',
      text: 'Canadian Plans sells home internet in British Columbia, Alberta, Manitoba and Saskatchewan. Elsewhere, ask each provider for the upload speed and data limit at your address. In rural areas, older satellite internet can add around half a second of delay, which hurts a video call more than a low download speed does. Fixed wireless and newer low-orbit satellite services have much less delay. If you are moving to another province, join the wish list on the order page and we email you when it opens.',
    },
    {
      kind: 'tip',
      label: 'New job, new home?',
      text: 'Order before you get the keys and give your advisor your move-in date. Ask for the upload speed at your address while they confirm availability, so you are working on a connection you have checked and not just a headline number.',
    },
    {
      kind: 'faq',
      id: 'guide-faq',
      title: 'FAQ',
      items: [
        {
          id: 'is-100-enough',
          question: 'Is 100 Mbps enough for working from home?',
          answer:
            'For one person, yes. A 1080p Zoom call needs under 4 Mbps each way, so 100 Mbps leaves room for someone else to stream. If two people work from home or you move large files, 300 to 500 Mbps is more comfortable, and you should check the upload speed too.',
        },
        {
          id: 'is-50-enough',
          question: 'Is 50 Mbps enough to work from home?',
          answer:
            'Usually, for one person on calls and cloud apps. It is also the CRTC’s national target, with 10 Mbps upload. It runs out of room quickly in a shared home.',
        },
        {
          id: 'upload-needed',
          question: 'What upload speed do I need for Zoom or Teams?',
          answer:
            'Zoom lists 3.8 Mbps upload for 1080p group video and Microsoft recommends 2.5 Mbps for Teams meetings. Aim for at least 10 Mbps so calls, screen sharing and a cloud backup do not compete, and 20 Mbps or more if you share the connection or upload big files.',
        },
        {
          id: 'data-use',
          question: 'How much data does working from home use?',
          answer:
            'Video calls use the most. An hour of 1080p group video is up to about 3 GB, so a busy month can pass 200 GB before streaming and updates. Choose an unlimited plan.',
        },
        {
          id: 'wifi-or-cable',
          question: 'Is Wi-Fi or Ethernet better for working from home?',
          answer:
            'Ethernet. A cable avoids interference and gives a steadier ping. If you must use Wi-Fi, put the router in a central spot, use the 5 GHz band when you are near it, and consider a mesh system for a large home.',
        },
        {
          id: 'claim-internet',
          question: 'Can I claim my home internet on my taxes in Canada?',
          answer:
            'Possibly. If your employer requires you to work from home and signs a Form T2200, the CRA lets you claim the work share of reasonable monthly internet fees on Form T777. Modem or router rental and connection fees are not allowed. This is general information, not tax advice.',
        },
        {
          id: 'need-fibre',
          question: 'Do I need fibre to work from home?',
          answer:
            'No. What matters is a steady connection with enough upload. Fibre is often symmetrical, which helps people who send large files, but a good cable plan is fine for calls and documents. Ask the provider for the upload speed at your address.',
        },
        {
          id: 'worth-gig',
          question: 'Is 1 Gbps worth it for working from home?',
          answer:
            'Not for calls alone. It pays off when several people share the line or you move large files. A 10 GB upload takes about 13 minutes at 100 Mbps upload and under 3 minutes at 500 Mbps. Your speed test and your upload number tell you more than the plan name.',
        },
      ],
    },
  ],
  sources:
    'Sources: Zoom bandwidth requirements (support.zoom.com), Microsoft Teams network requirements (Microsoft Learn, updated July 2026), Netflix recommended internet speeds (help.netflix.com), CRTC Telecom Regulatory Policy 2016-496, Ookla Speedtest Global Index as reported by ISPreview (May 2026), and the Canada Revenue Agency’s home office expense pages and guide T4044. Plan details come from the Canadian Plans internet catalogue, confirmed by the owner on 20 October 2026. Availability and upload speed depend on your address. General information, not tax advice.',
};
