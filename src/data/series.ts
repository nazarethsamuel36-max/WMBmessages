export interface SermonSeries {
  id: string;
  title: string;
  messageIds: string[];
  note?: string;
}

export const sermonSeries: SermonSeries[] = [
  {
    id: 'church-ages',
    title: 'An Exposition Of The Seven Church Ages',
    messageIds: [
      'CAB-00',
      'CAB-01',
      'CAB-02',
      'CAB-03',
      'CAB-04',
      'CAB-05',
      'CAB-06',
      'CAB-07',
      'CAB-08',
      'CAB-09',
      'CAB-10',
    ],
    note: 'The Table lists this as book chapters, not dated sermon messages.',
  },
  {
    id: 'seven-seals',
    title: 'The Revelation Of The Seven Seals',
    messageIds: [
      '63-0317M',
      '63-0317E',
      '63-0318',
      '63-0319',
      '63-0320',
      '63-0321',
      '63-0322',
      '63-0323',
      '63-0324M',
      '63-0324E',
    ],
  },
  {
    id: 'hebrews',
    title: 'The Book Of Hebrews',
    messageIds: [
      '57-0821',
      '57-0825M',
      '57-0825E',
      '57-0828',
      '57-0901M',
      '57-0901E',
      '57-0908M',
      '57-0908E',
      '57-0915M',
      '57-0915E',
      '57-0922E',
    ],
  },
  {
    id: 'seventy-weeks',
    title: 'The Seventy Weeks Of Daniel',
    messageIds: ['61-0730M', '61-0730E', '61-0806'],
  },
];
