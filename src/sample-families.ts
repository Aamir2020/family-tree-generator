import type { FamilyGraph } from './types';

export const bennettExample: FamilyGraph = {
  version: 1,
  title: 'The Bennett family',
  people: [
    {
      id: '1',
      name: 'Arthur Bennett',
      gender: 'male',
      born: '1946',
      notes: 'A gardener with a story for every season.',
      x: 430,
      y: 130,
    },
    {
      id: '2',
      name: 'Eleanor Bennett',
      gender: 'female',
      born: '1948',
      notes: 'The heart of every family gathering.',
      x: 730,
      y: 130,
    },
    {
      id: '3',
      name: 'James Bennett',
      gender: 'male',
      born: '1974',
      notes: 'Always planning the next family adventure.',
      x: 430,
      y: 355,
    },
    {
      id: '4',
      name: 'Sophie Bennett',
      gender: 'female',
      born: '1977',
      notes: 'Collector of recipes and little moments.',
      x: 730,
      y: 355,
    },
    {
      id: '5',
      name: 'Oliver Bennett',
      gender: 'male',
      born: '2004',
      notes: '',
      x: 300,
      y: 580,
    },
    {
      id: '6',
      name: 'Emma Bennett',
      gender: 'female',
      born: '2008',
      notes: '',
      x: 570,
      y: 580,
    },
  ],
  connections: [
    { id: 'a', from: '1', to: '2', type: 'wife' },
    { id: 'b', from: '3', to: '1', type: 'father' },
    { id: 'c', from: '3', to: '2', type: 'mother' },
    { id: 'd', from: '3', to: '4', type: 'wife' },
    { id: 'e', from: '3', to: '5', type: 'son' },
    { id: 'f', from: '3', to: '6', type: 'daughter' },
  ],
};

// Fictional example; birthday details intentionally left optional.
export const whiteExample: FamilyGraph = {
  version: 1,
  title: 'The White family · Breaking Bad',
  people: [
    {
      id: 'walter',
      name: 'Walter White',
      gender: 'male',
      born: '',
      notes:
        'Chemistry teacher in Albuquerque. Husband of Skyler and father of Walter Jr. and Holly.',
      x: 320,
      y: 160,
    },
    {
      id: 'skyler',
      name: 'Skyler White',
      gender: 'female',
      born: '',
      notes: 'Wife of Walter and mother of Walter Jr. and Holly.',
      x: 680,
      y: 160,
    },
    {
      id: 'flynn',
      name: 'Walter White Jr.',
      gender: 'male',
      born: '',
      notes: 'Also known as Flynn. Son of Walter and Skyler.',
      x: 320,
      y: 470,
    },
    {
      id: 'holly',
      name: 'Holly White',
      gender: 'female',
      born: '',
      notes: 'Daughter of Walter and Skyler; younger sister of Walter Jr.',
      x: 680,
      y: 470,
    },
  ],
  connections: [
    { id: 'white-marriage', from: 'walter', to: 'skyler', type: 'wife' },
    { id: 'flynn-father', from: 'flynn', to: 'walter', type: 'father' },
    { id: 'flynn-mother', from: 'flynn', to: 'skyler', type: 'mother' },
    { id: 'holly-father', from: 'holly', to: 'walter', type: 'father' },
    { id: 'holly-mother', from: 'holly', to: 'skyler', type: 'mother' },
  ],
};

// A small public example from the Royal Family's official biographies:
// https://www.royal.uk/the-prince-of-wales
// https://www.royal.uk/the-princess-of-wales
export const walesExample: FamilyGraph = {
  version: 1,
  title: 'The British royal family',
  people: [
    {
      id: 'william',
      name: 'Prince William',
      gender: 'male',
      born: '',
      notes:
        'Prince of Wales. Husband of Catherine and father of George, Charlotte, and Louis.',
      x: 380,
      y: 160,
    },
    {
      id: 'catherine',
      name: 'Catherine, Princess of Wales',
      gender: 'female',
      born: '',
      notes: 'Wife of William and mother of George, Charlotte, and Louis.',
      x: 740,
      y: 160,
    },
    {
      id: 'george',
      name: 'Prince George',
      gender: 'male',
      born: '',
      notes: 'Eldest child of William and Catherine.',
      x: 200,
      y: 470,
    },
    {
      id: 'charlotte',
      name: 'Princess Charlotte',
      gender: 'female',
      born: '',
      notes: 'Daughter of William and Catherine.',
      x: 560,
      y: 470,
    },
    {
      id: 'louis',
      name: 'Prince Louis',
      gender: 'male',
      born: '',
      notes: 'Youngest child of William and Catherine.',
      x: 920,
      y: 470,
    },
  ],
  connections: [
    { id: 'royal-marriage', from: 'william', to: 'catherine', type: 'wife' },
    { id: 'george-father', from: 'george', to: 'william', type: 'father' },
    { id: 'george-mother', from: 'george', to: 'catherine', type: 'mother' },
    {
      id: 'charlotte-father',
      from: 'charlotte',
      to: 'william',
      type: 'father',
    },
    {
      id: 'charlotte-mother',
      from: 'charlotte',
      to: 'catherine',
      type: 'mother',
    },
    { id: 'louis-father', from: 'louis', to: 'william', type: 'father' },
    { id: 'louis-mother', from: 'louis', to: 'catherine', type: 'mother' },
  ],
};

// The ancestry branch through Charles and Diana to Elizabeth II and Philip.
// Charles and Diana are linked as William's parents, without a spouse edge:
// their marriage ended in divorce. Sources:
// https://www.royal.uk/the-king
// https://www.royal.uk/diana-princess-wales
// https://www.royal.uk/family-life
export const royalExample: FamilyGraph = {
  ...walesExample,
  people: [
    {
      id: 'elizabeth',
      name: 'Queen Elizabeth II',
      gender: 'female',
      born: '',
      notes:
        'Wife of Prince Philip, mother of Charles, and grandmother of William.',
      x: 260,
      y: 60,
    },
    {
      id: 'philip',
      name: 'Prince Philip',
      gender: 'male',
      born: '',
      notes:
        'Duke of Edinburgh. Husband of Elizabeth II and father of Charles.',
      x: 620,
      y: 60,
    },
    {
      id: 'charles',
      name: 'King Charles III',
      gender: 'male',
      born: '',
      notes:
        'Son of Elizabeth II and Philip. Father of William. His marriage to Diana ended in divorce.',
      x: 260,
      y: 310,
    },
    {
      id: 'diana',
      name: 'Diana, Princess of Wales',
      gender: 'female',
      born: '',
      notes: 'Mother of William. Former wife of Charles.',
      x: 620,
      y: 310,
    },
    ...walesExample.people.map((person) => ({
      ...person,
      x: person.x + 60,
      y: person.y + 400,
    })),
  ],
  connections: [
    {
      id: 'elizabeth-philip-marriage',
      from: 'philip',
      to: 'elizabeth',
      type: 'wife',
    },
    { id: 'charles-mother', from: 'charles', to: 'elizabeth', type: 'mother' },
    { id: 'charles-father', from: 'charles', to: 'philip', type: 'father' },
    { id: 'william-father', from: 'william', to: 'charles', type: 'father' },
    { id: 'william-mother', from: 'william', to: 'diana', type: 'mother' },
    ...walesExample.connections,
  ],
};
