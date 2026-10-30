export type StudyConcept = {
  id: string;
  label: string;
  aliases: string[];
};

export type StudyQuestion = {
  id: string;
  subject: string;
  prompt: string;
  expectedAnswer: string;
  hint: string;
  gradingMode: "key-concepts";
  concepts: StudyConcept[];
  startingMastery: number;
};

export const studyQuestions: StudyQuestion[] = [
  {
    id: "science-states-of-matter",
    subject: "Science",
    prompt: "What are the three states of matter?",
    expectedAnswer: "Solid, liquid, and gas.",
    hint: "Think about how matter can keep its shape, flow, or spread out to fill a space.",
    gradingMode: "key-concepts",
    concepts: [
      { id: "solid", label: "solid", aliases: ["solid", "solids"] },
      { id: "liquid", label: "liquid", aliases: ["liquid", "liquids"] },
      { id: "gas", label: "gas", aliases: ["gas", "gases"] },
    ],
    startingMastery: 2,
  },
  {
    id: "history-first-president",
    subject: "History",
    prompt: "Who was the first president of the United States?",
    expectedAnswer: "George Washington.",
    hint: "Think about the general who led the Continental Army during the American Revolution.",
    gradingMode: "key-concepts",
    concepts: [
      {
        id: "george-washington",
        label: "George Washington",
        aliases: ["george washington", "washington"],
      },
    ],
    startingMastery: 2,
  },
  {
    id: "math-hexagon-sides",
    subject: "Math",
    prompt: "How many sides does a hexagon have?",
    expectedAnswer: "Six.",
    hint: "Picture a hexagon and count each straight edge once as you move around the shape.",
    gradingMode: "key-concepts",
    concepts: [{ id: "six", label: "six", aliases: ["six", "6"] }],
    startingMastery: 2,
  },
  {
    id: "science-herbivore",
    subject: "Science",
    prompt: "What does a herbivore eat?",
    expectedAnswer: "Plants or plant material.",
    hint: "Think about animals such as deer, cows, and rabbits and what they mostly eat.",
    gradingMode: "key-concepts",
    concepts: [
      {
        id: "plants",
        label: "plants",
        aliases: ["plant", "plants", "plant material", "vegetation"],
      },
    ],
    startingMastery: 2,
  },
  {
    id: "geography-five-oceans",
    subject: "Geography",
    prompt: "Name the five oceans.",
    expectedAnswer: "Pacific, Atlantic, Indian, Southern, and Arctic.",
    hint: "Start with the oceans on either side of North America, then think about the waters near India and the two polar regions.",
    gradingMode: "key-concepts",
    concepts: [
      { id: "pacific", label: "Pacific", aliases: ["pacific", "pacific ocean"] },
      { id: "atlantic", label: "Atlantic", aliases: ["atlantic", "atlantic ocean"] },
      { id: "indian", label: "Indian", aliases: ["indian", "indian ocean"] },
      { id: "southern", label: "Southern", aliases: ["southern", "southern ocean", "antarctic ocean"] },
      { id: "arctic", label: "Arctic", aliases: ["arctic", "arctic ocean"] },
    ],
    startingMastery: 1,
  },
  {
    id: "science-closest-planet",
    subject: "Science",
    prompt: "Which planet is closest to the Sun?",
    expectedAnswer: "Mercury.",
    hint: "Think of the planets in order starting at the Sun. Which one comes first?",
    gradingMode: "key-concepts",
    concepts: [{ id: "mercury", label: "Mercury", aliases: ["mercury"] }],
    startingMastery: 2,
  },
  {
    id: "civics-three-branches",
    subject: "Civics",
    prompt: "What are the three branches of the United States government?",
    expectedAnswer: "Legislative, executive, and judicial.",
    hint: "Think about the groups that make the laws, carry out the laws, and interpret the laws.",
    gradingMode: "key-concepts",
    concepts: [
      { id: "legislative", label: "legislative", aliases: ["legislative", "legislature"] },
      { id: "executive", label: "executive", aliases: ["executive"] },
      { id: "judicial", label: "judicial", aliases: ["judicial", "judiciary"] },
    ],
    startingMastery: 1,
  },
  {
    id: "science-breathing-gas",
    subject: "Science",
    prompt: "What gas do humans need to breathe to survive?",
    expectedAnswer: "Oxygen.",
    hint: "Think about the gas your lungs take from the air and your blood carries through your body.",
    gradingMode: "key-concepts",
    concepts: [{ id: "oxygen", label: "oxygen", aliases: ["oxygen"] }],
    startingMastery: 2,
  },
];

export function getStudyQuestion(id: string | null | undefined) {
  return studyQuestions.find((question) => question.id === id) ?? null;
}
