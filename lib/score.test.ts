import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NOT_IN_DOCUMENTS_SENTENCE } from "./answer.ts";
import { scoreResult, type Question } from "./score.ts";

const DOC = "Doc A";
const answerable: Question = {
  id: "t1",
  question: "What is the deductible?",
  split: "dev",
  category: "fact",
  document: DOC,
  gold_pages: [30, 164],
  must_include: [["\\$350(?!,?\\d|\\.\\d)"], ["per person", "individual"]],
  reference: "",
  unanswerable: false,
};
const unanswerable: Question = { ...answerable, id: "t2", category: "unanswerable", document: null, gold_pages: [], must_include: [], unanswerable: true };
const cite = (page: number, documentName = DOC) => ({ documentName, page });

test("right facts and a gold-page citation is correct", () => {
  const s = scoreResult(answerable, { answer: "It is **$350** per person.", citations: [cite(164)] });
  assert.deepEqual(s, { factsMet: true, missedFacts: [], citationHit: true, abstained: false, correct: true });
});

type Scored = ReturnType<typeof scoreResult>;
type Row = [name: string, answer: string, citations: ReturnType<typeof cite>[], expect: Partial<Scored>];

function table(q: Question, rows: Row[]) {
  for (const [name, answer, citations, expect] of rows) {
    test(name, () => {
      const s = scoreResult(q, { answer, citations });
      for (const [key, want] of Object.entries(expect)) assert.deepEqual(s[key as keyof Scored], want, key);
    });
  }
}

table(answerable, [
  ["right facts with no citation is wrong", "It is $350 per person.", [], { factsMet: true, citationHit: false, correct: false }],
  [
    "right citation with the wrong number is wrong",
    "It is $300 per person.",
    [cite(30)],
    { citationHit: true, factsMet: false, correct: false, missedFacts: [["\\$350(?!,?\\d|\\.\\d)"]] },
  ],
  ["a number that only contains the right one does not match", "It is $3,500 per person.", [cite(30)], { factsMet: false }],
  ["every fact is required: any alternative satisfies one fact", "$350 for an individual", [cite(30)], { correct: true }],
  ["every fact is required: a missing fact is reported", "$350", [cite(30)], { correct: false, missedFacts: [["per person", "individual"]] }],
  ["matching ignores case and line breaks", "$350 PER\nPERSON", [cite(30)], { factsMet: true }],
  ["matching ignores bold markers", "$**350** per person", [cite(30)], { factsMet: true }],
  ["a citation on a non-gold page is wrong", "$350 per person", [cite(31)], { citationHit: false, correct: false }],
  ["a gold page number in the wrong document is wrong", "$350 per person", [cite(30, "Doc B")], { citationHit: false, correct: false }],
  ["one gold citation among others is enough", "$350 per person", [cite(5), cite(164), cite(99, "Doc B")], { correct: true }],
  ["abstaining on an answerable question is wrong", NOT_IN_DOCUMENTS_SENTENCE, [], { abstained: true, correct: false }],
  ["abstaining wins over matching text and citations", `${NOT_IN_DOCUMENTS_SENTENCE} $350 per person`, [cite(30)], { abstained: true, correct: false }],
]);

test("unanswerable: abstaining with no citations is correct", () => {
  const s = scoreResult(unanswerable, { answer: NOT_IN_DOCUMENTS_SENTENCE, citations: [] });
  assert.deepEqual(s, { factsMet: false, missedFacts: [], citationHit: false, abstained: true, correct: true });
});

table(unanswerable, [
  ["unanswerable: the sentence may be padded with whitespace", `  ${NOT_IN_DOCUMENTS_SENTENCE}\n`, [], { correct: true }],
  ["unanswerable: answering is wrong", "The deductible will be $400 in 2027.", [cite(30)], { abstained: false, correct: false }],
  ["unanswerable: answering with no citation is wrong", "The deductible will be $400.", [], { correct: false }],
  ["unanswerable: abstaining while still citing is wrong", NOT_IN_DOCUMENTS_SENTENCE, [cite(30)], { correct: false }],
  ["unanswerable: the sentence must be at the start", `I think so. ${NOT_IN_DOCUMENTS_SENTENCE}`, [], { correct: false }],
  ["unanswerable: an empty answer is wrong", "", [], { correct: false }],
]);

test("the frozen set is well formed and every regex compiles", () => {
  const set: Question[] = JSON.parse(readFileSync(new URL("../eval/questions.json", import.meta.url), "utf8"));
  assert.equal(set.length, 50);
  assert.equal(new Set(set.map((q) => q.id)).size, 50);
  assert.equal(set.filter((q) => q.split === "dev").length, 20);
  for (const q of set) {
    assert.equal(q.unanswerable, q.category === "unanswerable", q.id);
    assert.equal(q.document === null, q.unanswerable, q.id);
    assert.equal(q.gold_pages.length === 0, q.unanswerable, q.id);
    assert.equal(q.must_include.length === 0, q.unanswerable, q.id);
    for (const alts of q.must_include) for (const a of alts) assert.doesNotThrow(() => new RegExp(a, "i"), `${q.id} ${a}`);
  }
});
