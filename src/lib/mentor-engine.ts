import type { CareerGoal, MatchResult, Professor, ProfessorSourceType, Publication, StudentProfile } from '../types';

export type SourcePreview = {
  title?: string;
  description?: string;
  headings: string[];
  fetched: boolean;
  fetchNote?: string;
  sourceType: ProfessorSourceType;
  sourceReliability: number;
};

type ResearchTrack = {
  id: string;
  label: string;
  department: string;
  keywords: string[];
  methods: string[];
  summary: string;
  bioLead: string;
  publicationNouns: string[];
  venues: string[];
  mentorshipSignals: string[];
};

const CURRENT_YEAR = new Date().getFullYear();

const STOPWORDS = new Set([
  'www', 'edu', 'com', 'org', 'net', 'the', 'and', 'lab', 'labs', 'faculty', 'people', 'person',
  'department', 'dept', 'profile', 'staff', 'user', 'home', 'research', 'group', 'page',
]);

export const RESEARCH_TRACKS: ResearchTrack[] = [
  {
    id: 'cognitive-neuroscience',
    label: 'Cognitive Neuroscience',
    department: 'Psychology and Neuroscience',
    keywords: ['cognition', 'memory', 'attention', 'learning', 'brain', 'neural', 'sleep', 'perception'],
    methods: ['fMRI', 'EEG', 'Computational Modeling', 'Neuroimaging', 'Longitudinal Analysis'],
    summary: 'Focuses on memory consolidation, attention, and neural representation across behavioral and imaging studies.',
    bioLead: 'Builds a research program around how measurable brain activity maps onto learning, memory, and adaptive behavior.',
    publicationNouns: ['memory consolidation', 'attention control', 'neural encoding', 'sleep-dependent learning', 'cognitive flexibility'],
    venues: ['Journal of Cognitive Neuroscience', 'Nature Human Behaviour', 'Cerebral Cortex', 'Neuron'],
    mentorshipSignals: ['Runs a cross-disciplinary lab with graduate and post-baccalaureate researchers.', 'Frequently mentors students on experimental design and analysis pipelines.'],
  },
  {
    id: 'computational-social-science',
    label: 'Computational Social Science',
    department: 'Sociology and Data Science',
    keywords: ['social', 'network', 'mobility', 'policy', 'behavior', 'inequality', 'data', 'community'],
    methods: ['Machine Learning', 'Social Network Analysis', 'Longitudinal Analysis', 'Survey Methods'],
    summary: 'Studies institutions and social behavior with large-scale behavioral data, network analysis, and causal inference.',
    bioLead: 'Combines network methods with administrative and behavioral data to study institutions, diffusion, and opportunity.',
    publicationNouns: ['network diffusion', 'policy adoption', 'mobility pathways', 'institutional trust', 'behavioral spillovers'],
    venues: ['American Journal of Sociology', 'Nature Communications', 'PNAS', 'Computational Social Science Journal'],
    mentorshipSignals: ['Maintains active collaborations across public-interest and applied research teams.', 'Often publishes with graduate co-authors and interdisciplinary collaborators.'],
  },
  {
    id: 'public-policy',
    label: 'Public Policy',
    department: 'Public Policy',
    keywords: ['policy', 'governance', 'evaluation', 'public', 'institutions', 'equity', 'programs', 'government'],
    methods: ['RCTs', 'Field Experiments', 'Survey Methods', 'Qualitative Interviews', 'Longitudinal Analysis'],
    summary: 'Evaluates public programs and institutions with mixed methods, causal inference, and implementation-focused fieldwork.',
    bioLead: 'Works at the boundary of public systems, rigorous evaluation, and implementation strategy.',
    publicationNouns: ['program evaluation', 'implementation fidelity', 'policy spillovers', 'public service delivery', 'equity outcomes'],
    venues: ['Journal of Policy Analysis and Management', 'World Development', 'Policy Studies Journal', 'Public Administration Review'],
    mentorshipSignals: ['Advises projects that combine public-sector partnerships with rigorous evaluation.', 'Supports students who want to work across research, policy, and implementation.'],
  },
  {
    id: 'machine-learning',
    label: 'Machine Learning',
    department: 'Computer Science',
    keywords: ['machine', 'learning', 'representation', 'optimization', 'vision', 'language', 'robustness', 'models'],
    methods: ['Machine Learning', 'Computational Modeling', 'Longitudinal Analysis'],
    summary: 'Builds machine learning systems with an emphasis on robust modeling, representation learning, and evaluation.',
    bioLead: 'Studies how modern learning systems generalize, adapt, and remain reliable under real-world constraints.',
    publicationNouns: ['representation learning', 'robust training', 'multimodal reasoning', 'model evaluation', 'adaptive inference'],
    venues: ['NeurIPS', 'ICML', 'ICLR', 'Transactions on Machine Learning Research'],
    mentorshipSignals: ['Publishes frequently with student co-authors on both theoretical and applied work.', 'Supports projects that move from methods development to real-world deployment.'],
  },
  {
    id: 'biomedical-science',
    label: 'Biomedical Science',
    department: 'Molecular Biology and Genetics',
    keywords: ['cell', 'gene', 'molecular', 'cancer', 'protein', 'biology', 'disease', 'genomics'],
    methods: ['Animal Models', 'Machine Learning', 'Longitudinal Analysis'],
    summary: 'Connects molecular mechanisms to disease progression through translational experiments and computational analysis.',
    bioLead: 'Investigates how cellular and molecular pathways drive disease progression and treatment response.',
    publicationNouns: ['tumor progression', 'genomic regulation', 'protein signaling', 'translational biomarkers', 'disease mechanisms'],
    venues: ['Cell', 'Cancer Discovery', 'Nature Genetics', 'Genome Biology'],
    mentorshipSignals: ['Leads a translational research team with strong wet-lab and computational collaboration.', 'Structures student projects around publication-ready milestones and cross-training.'],
  },
  {
    id: 'education-psychology',
    label: 'Education Psychology',
    department: 'Education and Psychology',
    keywords: ['education', 'classroom', 'learning', 'motivation', 'students', 'assessment', 'teachers', 'development'],
    methods: ['Qualitative Interviews', 'Survey Methods', 'Longitudinal Analysis', 'Field Experiments'],
    summary: 'Studies learning environments, student development, and instructional design with mixed qualitative and quantitative methods.',
    bioLead: 'Explores how institutions, teaching practice, and motivation shape developmental and educational outcomes.',
    publicationNouns: ['student motivation', 'classroom climate', 'instructional design', 'equity in learning', 'teacher development'],
    venues: ['American Educational Research Journal', 'Learning and Instruction', 'Educational Psychologist', 'Journal of Educational Psychology'],
    mentorshipSignals: ['Builds collaborative, practice-facing research projects with school and community partners.', 'Mentors students who work across qualitative and quantitative designs.'],
  },
  {
    id: 'neuroeconomics',
    label: 'Neuroeconomics',
    department: 'Economics and Neuroscience',
    keywords: ['decision', 'reward', 'value', 'risk', 'choice', 'emotion', 'incentives', 'altruism'],
    methods: ['fMRI', 'Computational Modeling', 'Survey Methods', 'Neuroimaging', 'Longitudinal Analysis'],
    summary: 'Studies how the brain computes value, uncertainty, self-control, and social choice using tools from economics, psychology, and neuroscience.',
    bioLead: 'Builds an interdisciplinary research program around reward, valuation, risk, and strategic or social decision-making.',
    publicationNouns: ['value-based choice', 'reward anticipation', 'social preferences', 'self-control', 'risk and ambiguity'],
    venues: ['Nature Reviews Neuroscience', 'Neuron', 'Journal of Neuroscience', 'Journal of Economic Behavior & Organization'],
    mentorshipSignals: ['Often mentors students across economics, psychology, and neuroscience training paths.', 'Publishes collaborative work that links behavioral experiments with brain and computational measures.'],
  },
];

const INSTITUTION_MAP: Record<string, string> = {
  mit: 'Massachusetts Institute of Technology',
  stanford: 'Stanford University',
  harvard: 'Harvard University',
  princeton: 'Princeton University',
  yale: 'Yale University',
  columbia: 'Columbia University',
  penn: 'University of Pennsylvania',
  berkeley: 'University of California, Berkeley',
  ucla: 'University of California, Los Angeles',
  nyu: 'New York University',
  cmu: 'Carnegie Mellon University',
  duke: 'Duke University',
  cornell: 'Cornell University',
  uchicago: 'University of Chicago',
  northwestern: 'Northwestern University',
  umich: 'University of Michigan',
  gatech: 'Georgia Institute of Technology',
  ox: 'University of Oxford',
  cam: 'University of Cambridge',
};

const PREFERENCE_TO_SUBSCORE = {
  topicOverlap: 'topic',
  methodsOverlap: 'methods',
  trajectory: 'trajectory',
  activity: 'activity',
  network: 'network',
  mentorship: 'mentorship',
  careerAlignment: 'careerAlignment',
} as const;

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function titleCase(input: string) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function normalizeToken(token: string) {
  return token.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function tokenize(text: string) {
  return unique(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !STOPWORDS.has(token))
  );
}

function buildTextPool(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function overlapScore(left: string[], right: string[]) {
  if (!left.length || !right.length) {
    return 0;
  }

  const rightSet = new Set(right);
  const shared = left.filter((token) => rightSet.has(token)).length;
  return shared / Math.sqrt(left.length * right.length);
}

function inferSourceType(url: URL): ProfessorSourceType {
  if (url.hostname.includes('scholar.google')) {
    return 'Google Scholar';
  }
  if (url.hostname.includes('orcid.org')) {
    return 'ORCID';
  }
  if (/lab|labs|center|centre|group|institute/.test(url.pathname)) {
    return 'Lab Page';
  }
  if (/faculty|people|person|staff/.test(url.pathname)) {
    return 'Faculty Page';
  }
  return 'Personal Website';
}

function inferInstitution(url: URL) {
  const hostParts = url.hostname.split('.');
  const matchedKey = hostParts.find((part) => INSTITUTION_MAP[part]);
  if (matchedKey) {
    return INSTITUTION_MAP[matchedKey];
  }

  const candidate = hostParts.find((part) => part !== 'www' && part !== 'edu' && part !== 'org' && part !== 'com');
  if (!candidate) {
    return 'Independent Research Institute';
  }

  return url.hostname.endsWith('.edu') ? `${titleCase(candidate)} University` : titleCase(candidate);
}

function inferName(url: URL, preview?: SourcePreview) {
  const previewTitle = preview?.title
    ?.split(/\s[|•]\s|\s-\s/)
    .map((part) => part.trim().replace(/'s (Profile|Home Page)$/i, '').replace(/\b(Profile|Home Page)$/i, '').trim())
    .find((part) => part.split(/\s+/).length >= 2 && part.split(/\s+/).length <= 4);
  if (previewTitle) {
    return previewTitle;
  }

  const pathWords = url.pathname
    .split('/')
    .flatMap((part) => part.split(/[-_]+/g))
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && !STOPWORDS.has(part.toLowerCase()) && !/^\d+$/.test(part));

  if (pathWords.length >= 2) {
    return titleCase(pathWords.slice(0, 3).join(' '));
  }

  return `${titleCase(inferInstitution(url).split(' ')[0])} Research Profile`;
}

function seedFromString(value: string) {
  return Array.from(value).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function pickTrack(tokens: string[], studentProfile: StudentProfile) {
  const studentTokens = tokenize(buildTextPool([studentProfile.field, studentProfile.researchInterests, studentProfile.careerGoal, studentProfile.methods.join(' ')]));

  return RESEARCH_TRACKS
    .map((track) => ({
      track,
      score: overlapScore(tokens, track.keywords) * 2 + overlapScore(studentTokens, track.keywords),
    }))
    .sort((left, right) => right.score - left.score)[0]?.track ?? RESEARCH_TRACKS[0];
}

function sample<T>(items: T[], start: number, count: number) {
  return Array.from({ length: count }, (_, index) => items[(start + index) % items.length]);
}

function buildPublications(track: ResearchTrack, seed: number): Publication[] {
  const publicationCount = 5 + (seed % 3);
  const start = seed % track.publicationNouns.length;

  return Array.from({ length: publicationCount }, (_, index) => {
    const noun = track.publicationNouns[(start + index) % track.publicationNouns.length];
    const keywords = sample(track.keywords, start + index, 4);
    const methods = unique(sample(track.methods, start + index, Math.min(2, track.methods.length)));
    const coauthors = sample(
      ['A. Rivera', 'L. Thompson', 'M. Patel', 'S. Nguyen', 'J. Kim', 'R. Brooks', 'C. Hassan'],
      seed + index,
      3,
    );

    return {
      id: crypto.randomUUID(),
      title: `${titleCase(noun)} in ${titleCase(track.label)}`,
      abstract: `Explores ${keywords.slice(0, 3).join(', ')} using ${methods.join(' and ')} to produce interpretable evidence for ongoing research questions.`,
      year: CURRENT_YEAR - index,
      venue: track.venues[(start + index) % track.venues.length],
      keywords,
      methods,
      coauthors,
    };
  });
}

function buildHighlights(track: ResearchTrack, preview?: SourcePreview) {
  const highlights = [...track.mentorshipSignals];
  if (preview?.description) {
    highlights.unshift(preview.description);
  } else if (preview?.title) {
    highlights.unshift(`Source metadata suggests a ${track.label.toLowerCase()} profile with public-facing research materials.`);
  }
  return unique(highlights).slice(0, 3);
}

function scoreCareerAlignment(goal: CareerGoal, subscores: MatchResult['subscores']) {
  if (goal === 'Academic') {
    return Math.round(0.4 * subscores.mentorship + 0.35 * subscores.network + 0.25 * subscores.activity);
  }
  if (goal === 'Industry') {
    return Math.round(0.45 * subscores.methods + 0.35 * subscores.network + 0.2 * subscores.topic);
  }
  if (goal === 'Policy') {
    return Math.round(0.45 * subscores.topic + 0.3 * subscores.network + 0.25 * subscores.mentorship);
  }
  return Math.round(0.4 * subscores.topic + 0.35 * subscores.methods + 0.25 * subscores.mentorship);
}

function scoreOverall(profile: StudentProfile, subscores: MatchResult['subscores']) {
  const preferenceEntries = Object.entries(profile.preferences) as Array<[keyof StudentProfile['preferences'], number]>;
  const totals = preferenceEntries.reduce((accumulator, [key, weight]) => {
    const subscoreKey = PREFERENCE_TO_SUBSCORE[key];
    return {
      weighted: accumulator.weighted + weight * subscores[subscoreKey],
      totalWeight: accumulator.totalWeight + weight,
    };
  }, { weighted: 0, totalWeight: 0 });

  return Math.round(totals.weighted / Math.max(totals.totalWeight, 1));
}

function buildLimitation(professor: Professor, preview?: SourcePreview) {
  const sourceFetched = preview?.fetched ?? professor.sourceFetched ?? false;

  if (professor.profileOrigin === 'discovery') {
    return sourceFetched
      ? 'This profile is assembled from OpenAlex, ORCID, Semantic Scholar, and faculty or lab page metadata. Mentorship and lab-culture signals still need manual validation.'
      : 'This profile is assembled from OpenAlex, ORCID, and other public metadata, but no readable faculty or lab page was available during ingest.';
  }

  if (!sourceFetched) {
    return 'This profile is based mostly on link structure and student-side context because the page did not return readable metadata during ingest.';
  }

  return 'Mentorship and network signals are inferred from public-facing metadata and publication patterns rather than full advising records.';
}

function buildExplanation(professor: Professor, match: MatchResult) {
  const ranked = Object.entries(match.subscores)
    .sort((left, right) => right[1] - left[1])
    .map(([label, value]) => ({ label, value }));
  const strongest = ranked.slice(0, 2).map((item) => item.label);
  const weakest = ranked[ranked.length - 1];

  return `${professor.fullName} looks strongest on ${strongest[0]} and ${strongest[1]}, which suggests a clear overlap between your stated interests and this advisor's recent work. The publication set and methods profile indicate an active research program with enough breadth to support adjacent questions, not just a single niche. ${weakest.label === 'mentorship' ? 'Mentorship remains the least certain part of the profile because public sources rarely expose full lab outcomes.' : `The main tradeoff is ${weakest.label}, which trails the rest of the profile and should be checked manually before shortlisting.`}`;
}

export function buildProfessorProfile(urlInput: string, preview: SourcePreview | undefined, studentProfile: StudentProfile): Professor {
  const url = new URL(urlInput);
  const previewTokens = tokenize(buildTextPool([preview?.title, preview?.description, preview?.headings.join(' ')]));
  const urlTokens = tokenize(`${url.hostname} ${url.pathname} ${url.search}`);
  const tokens = unique([...urlTokens, ...previewTokens]);
  const track = pickTrack(tokens, studentProfile);
  const seed = seedFromString(urlInput);
  const institution = inferInstitution(url);
  const sourceType = preview?.sourceType ?? inferSourceType(url);
  const fullName = inferName(url, preview);
  const publications = buildPublications(track, seed);
  const highlights = buildHighlights(track, preview);

  return {
    id: crypto.randomUUID(),
    fullName,
    institution,
    department: track.department,
    profileOrigin: 'user',
    sourceType,
    sourceConfidence: clamp((preview?.sourceReliability ?? 0.4) + (preview?.fetched ? 0.2 : 0), 0.25, 0.95),
    sourceSummary: preview?.fetchNote ?? `${sourceType} parsed with a deterministic topic and methods model.`,
    sourceFetched: preview?.fetched ?? false,
    highlights,
    urls: {
      scholar: sourceType === 'Google Scholar' ? urlInput : undefined,
      orcid: sourceType === 'ORCID' ? urlInput : undefined,
      faculty: sourceType === 'Faculty Page' ? urlInput : undefined,
      lab: sourceType === 'Lab Page' ? urlInput : undefined,
    },
    bio: `${track.bioLead} ${track.summary} ${highlights[0]}`,
    publications,
  };
}

export function computeMatch(studentProfile: StudentProfile, professor: Professor, preview?: SourcePreview): MatchResult {
  const sourceFetched = preview?.fetched ?? professor.sourceFetched ?? false;
  const studentTokens = tokenize(buildTextPool([
    studentProfile.field,
    studentProfile.researchInterests,
    studentProfile.careerGoal,
    studentProfile.methods.join(' '),
  ]));
  const professorTokens = tokenize(buildTextPool([
    professor.bio,
    professor.department,
    professor.highlights?.join(' '),
    ...professor.publications.flatMap((publication) => [publication.title, publication.abstract, publication.keywords.join(' ')]),
  ]));

  const studentMethodSet = new Set(studentProfile.methods);
  const professorMethodSet = new Set(professor.publications.flatMap((publication) => publication.methods));
  const overlappingMethods = [...studentMethodSet].filter((method) => professorMethodSet.has(method));
  const methodUnion = new Set([...studentMethodSet, ...professorMethodSet]);

  const recentPublications = professor.publications.filter((publication) => publication.year >= CURRENT_YEAR - 2);
  const distinctCoauthors = unique(professor.publications.flatMap((publication) => publication.coauthors ?? []));
  const distinctVenues = unique(professor.publications.map((publication) => publication.venue).filter(Boolean) as string[]);

  const subscores: MatchResult['subscores'] = {
    topic: Math.round(clamp(overlapScore(studentTokens, professorTokens) * 115, 30, 96)),
    methods: Math.round(clamp((overlappingMethods.length / Math.max(methodUnion.size, 1)) * 130, 18, 95)),
    trajectory: Math.round(clamp((recentPublications.length / Math.max(professor.publications.length, 1)) * 100 + overlapScore(studentTokens, tokenize(recentPublications.map((publication) => publication.title).join(' '))) * 30, 35, 94)),
    activity: Math.round(clamp((recentPublications.length / 4) * 100, 40, 96)),
    network: Math.round(clamp((distinctCoauthors.length / 8) * 60 + (distinctVenues.length / 5) * 40, 30, 93)),
    mentorship: Math.round(clamp((professor.highlights?.length ?? 0) * 18 + (professor.sourceType === 'Lab Page' ? 22 : 12) + (recentPublications.length * 4), 38, 91)),
    careerAlignment: 0,
  };

  subscores.careerAlignment = scoreCareerAlignment(studentProfile.careerGoal, subscores);

  const overallScore = scoreOverall(studentProfile, subscores);
  const confidence = clamp(((professor.sourceConfidence ?? 0.5) * 0.45) + (professor.publications.length / 8) * 0.25 + (sourceFetched ? 0.2 : 0.05) + (overlappingMethods.length > 0 ? 0.1 : 0.04), 0.35, 0.97);
  const limitation = buildLimitation(professor, preview);

  const match: MatchResult = {
    professorId: professor.id,
    overallScore,
    subscores,
    explanation: '',
    confidence,
    limitation,
  };

  match.explanation = buildExplanation(professor, match);
  return match;
}
