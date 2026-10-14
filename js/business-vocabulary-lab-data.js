/**
 * Business Vocabulary Lab — verified question bank.
 * Source of truth: Business-Vocabulary-Lab-source-inventory.md
 * (Ian MacKenzie, English for Business Studies, 3rd ed., Student's Book).
 *
 * Included only when the inventory marks the item VERIFIED.
 * Excluded: U5 chart, U8-R1, U8-L1, U8-V2 item 6, U11-L1, U12-R1, U14-L1,
 * and the open "other combinations" follow-up on U14-V2.
 *
 * Mode map:
 *   read-fill ← U1-V2 COLLOCATION_GAP, U14-R1 GAP_FILL_FROM_BOX
 *   match     ← U1-V1, U12-V1, U14-V3 MATCH_DEFINITION; U8-V1 HALF_SENTENCE_MATCH; U14-V2 attested pairs
 *   quick     ← U2-V1, U8-V2 (except item 6), U11-V1, U13-V1, U14-V1 FIND_IN_TEXT
 *   sort      ← none (U8-R1 and U12-R1 are MANUAL_VERIFICATION)
 *   mixed     ← read-fill + match + quick for that unit, no duplicates
 */
(function () {
  const UNITS = [
    { number: 1, name: "Management" },
    { number: 2, name: "Work and motivation" },
    { number: 5, name: "Recruitment" },
    { number: 8, name: "Production" },
    { number: 11, name: "Products" },
    { number: 12, name: "Marketing" },
    { number: 13, name: "Advertising" },
    { number: 14, name: "Banking" }
  ];

  const ALLOWED_EXERCISES = {
    "U1-V1": 1, "U1-V2": 1, "U2-V1": 1, "U8-V1": 1, "U8-V2": 1,
    "U11-V1": 1, "U12-V1": 1, "U13-V1": 1,
    "U14-R1": 1, "U14-V1": 1, "U14-V2": 1, "U14-V3": 1
  };

  const EXPECTED = {
    1: { "read-fill": 6, match: 8, quick: 0, sort: 0, mixed: 14 },
    2: { "read-fill": 0, match: 0, quick: 9, sort: 0, mixed: 9 },
    5: { "read-fill": 0, match: 0, quick: 0, sort: 0, mixed: 0 },
    8: { "read-fill": 0, match: 9, quick: 9, sort: 0, mixed: 18 },
    11: { "read-fill": 0, match: 0, quick: 9, sort: 0, mixed: 9 },
    12: { "read-fill": 0, match: 10, quick: 0, sort: 0, mixed: 10 },
    13: { "read-fill": 0, match: 0, quick: 10, sort: 0, mixed: 10 },
    14: { "read-fill": 7, match: 18, quick: 14, sort: 0, mixed: 39 }
  };

  const questions = [];

  function addClosed(rows, build) {
    const options = rows.map(build.option);
    rows.forEach((row) => {
      questions.push({
        id: row.id,
        unit: build.unit,
        exercise: build.exercise,
        mode: build.mode,
        kind: "single",
        labelKey: build.labelKey,
        prompt: build.prompt(row),
        term: build.term(row),
        options: options.slice(),
        answer: build.answer(row),
        resolved: build.resolved ? build.resolved(row) : ""
      });
    });
  }

  addClosed([
    ["u1-v1-01", "consultant", "a person who provides expert advice to a company"],
    ["u1-v1-02", "crisis", "a situation of danger or difficulty"],
    ["u1-v1-03", "innovation", "a new idea or method"],
    ["u1-v1-04", "objective (noun)", "something you plan to do or achieve"],
    ["u1-v1-05", "promotion", "when someone is raised to a higher or more important position"],
    ["u1-v1-06", "public sector", "the section of the economy under government control"],
    ["u1-v1-07", "strategy", "a plan for achieving success"],
    ["u1-v1-08", "subordinate", "a person with a less important position in an organization"]
  ].map((r) => ({ id: r[0], word: r[1], definition: r[2] })), {
    unit: 1, exercise: "U1-V1", mode: "match", labelKey: "bvl.prompt.word",
    option: (r) => r.definition,
    prompt: (r) => r.word,
    term: (r) => (r.word === "objective (noun)" ? "objective" : r.word),
    answer: (r) => r.definition
  });

  const U1_BOX = [
    "allocate resources", "deal with crises", "make decisions", "perform tasks",
    "measure performance", "set objectives", "supervise subordinates"
  ];
  [
    ["u1-v2-01", "set objectives", "After an organization has _____, it has to make sure that it achieves them.", "After an organization has set objectives, it has to make sure that it achieves them."],
    ["u1-v2-02", "allocate resources", "Managers have to find the best way to _____ all the human, physical and capital _____ available to them.", "Managers have to find the best way to allocate all the human, physical and capital resources available to them."],
    ["u1-v2-03", "perform tasks", "Some people _____ better on their own while others work better in teams.", "Some people perform tasks better on their own while others work better in teams."],
    ["u1-v2-04", "supervise subordinates", "Managers _____ the work of their _____ and try to develop their abilities.", "Managers supervise the work of their subordinates and try to develop their abilities."],
    ["u1-v2-05", "measure performance", "Managers _____ the _____ of their staff to see whether they are reaching their targets.", "Managers measure the performance of their staff to see whether they are reaching their targets."]
  ].forEach((r) => {
    questions.push({
      id: r[0], unit: 1, exercise: "U1-V2", mode: "read-fill", kind: "single",
      labelKey: "bvl.prompt.collocation", prompt: r[2], term: r[1],
      options: U1_BOX.slice(), answer: r[1], resolved: r[3]
    });
  });
  questions.push({
    id: "u1-v2-06", unit: 1, exercise: "U1-V2", mode: "read-fill", kind: "ordered",
    labelKey: "bvl.prompt.ordered",
    prompt: "Top managers have to be prepared to _____ if they occur and then have to _____ quick _____.",
    term: "deal with crises",
    options: U1_BOX.slice(),
    answers: ["deal with crises", "make decisions"],
    resolved: "Top managers have to be prepared to deal with crises if they occur and then have to make quick decisions."
  });

  addClosed([
    ["u2-v1-01", "interactions between employers and employees, or managers and workers", "labour relations"],
    ["u2-v1-02", "knowing that there is little risk of losing one's employment", "job security"],
    ["u2-v1-03", "money paid (per hour or day or week) to manual workers", "wages"],
    ["u2-v1-04", "advantages that come with a job, apart from pay", "benefits"],
    ["u2-v1-05", "things that encourage people to do something", "incentives"],
    ["u2-v1-06", "to be raised to a higher rank or better job", "promotion"],
    ["u2-v1-07", "without any particular abilities acquired by training", "unskilled"],
    ["u2-v1-08", "regularly switching between different tasks", "job rotation"],
    ["u2-v1-09", "a company's shared attitudes, beliefs, practices and work relationships", "corporate culture"]
  ].map((r) => ({ id: r[0], gloss: r[1], word: r[2] })), {
    unit: 2, exercise: "U2-V1", mode: "quick", labelKey: "bvl.prompt.gloss",
    option: (r) => r.word, prompt: (r) => r.gloss, term: (r) => r.word, answer: (r) => r.word
  });

  addClosed([
    ["u8-v1-01", "Inventory (AmE and BrE) or stock (BrE) is a company's reserves", "of raw materials, parts, work in process, and finished products.", "inventory"],
    ["u8-v1-02", "A component is any of the pieces or parts", "that make up a product or machine.", "component"],
    ["u8-v1-03", "Capacity is the (maximum) rate of output", "that can be achieved from a production process.", "capacity"],
    ["u8-v1-04", "Plant is a collective word for all the buildings, machines, equipment,", "and other facilities used in the production process.", "plant"],
    ["u8-v1-05", "Location means the geographical situation", "of a factory or other facility.", "location"],
    ["u8-v1-06", "A supply chain is a network of organizations", "involved in producing and delivering goods or a service.", "supply chain"],
    ["u8-v1-07", "Outsourcing means buying products or processed materials", "from other companies rather than manufacturing them.", "outsourcing"],
    ["u8-v1-08", "Economies of scale are the cost savings", "arising from large-scale production.", "economies of scale"],
    ["u8-v1-09", "Lead time is the time needed to perform an activity", "such as manufacturing a product or delivering it to a customer.", "lead time"]
  ].map((r) => ({ id: r[0], left: r[1], right: r[2], term: r[3] })), {
    unit: 8, exercise: "U8-V1", mode: "match", labelKey: "bvl.prompt.half",
    option: (r) => r.right, prompt: (r) => r.left, term: (r) => r.term, answer: (r) => r.right
  });

  addClosed([
    ["u8-v2-01", "firmly fixed in something or part of something", "embedded"],
    ["u8-v2-02", "the quality of people's lives", "standards of living"],
    ["u8-v2-03", "someone who establishes a company", "founder"],
    ["u8-v2-04", "(in this context) the potential cost of taking a chance", "risk premium"],
    ["u8-v2-05", "(in this context) the value of a business activity", "equity"],
    ["u8-v2-07", "increasing or decreasing more and more quickly as time passes", "exponentially"],
    ["u8-v2-08", "the obtaining of supplies", "procurement"],
    ["u8-v2-09", "the state of being successful and having a lot of money", "prosperity"],
    ["u8-v2-10", "the situation when something is not likely to change", "stability"]
  ].map((r) => ({ id: r[0], gloss: r[1], word: r[2] })), {
    unit: 8, exercise: "U8-V2", mode: "quick", labelKey: "bvl.prompt.gloss",
    option: (r) => r.word, prompt: (r) => r.gloss, term: (r) => r.word, answer: (r) => r.word
  });

  addClosed([
    ["u11-v1-01", "places of business for selling goods to customers (shops, stores, kiosks, etc.)", "outlets"],
    ["u11-v1-02", "all the different products, brands and items that a company sells", "product mix"],
    ["u11-v1-03", "businesses that sell goods or merchandise to individual consumers", "retailers"],
    ["u11-v1-04", "a graphic image or symbol specially created to identify a company or a product", "logo"],
    ["u11-v1-05", "wrappers and containers used to enclose and protect a product", "packaging"],
    ["u11-v1-06", "the extent to which consumers are aware of a brand, and know its name", "brand recognition"],
    ["u11-v1-07", "surfaces in a store on which goods are displayed", "shelves"],
    ["u11-v1-08", "the sales of a company expressed as a percentage of total sales in a given market", "market share"],
    ["u11-v1-09", "consumers who buy various competing products rather than being loyal to a particular brand", "brand-switchers"]
  ].map((r) => ({ id: r[0], gloss: r[1], word: r[2] })), {
    unit: 11, exercise: "U11-V1", mode: "quick", labelKey: "bvl.prompt.gloss",
    option: (r) => r.word, prompt: (r) => r.gloss, term: (r) => r.word, answer: (r) => r.word
  });

  addClosed([
    ["u12-v1-01", "all the companies or individuals (‘middlemen’) involved in moving goods or services from producers to consumers", "distribution channel"],
    ["u12-v1-02", "an intermediary that stocks manufacturers' goods or merchandise, and sells it to retailers and professional buyers", "wholesaler"],
    ["u12-v1-03", "dividing a market into distinct groups of buyers who have different requirements or buying habits", "market segmentation"],
    ["u12-v1-04", "making a product (appear to be) different from similar products offered by other sellers…", "product differentiation"],
    ["u12-v1-05", "possibilities of filling unsatisfied needs in sectors in which a company can profitably produce goods or services", "market opportunities"],
    ["u12-v1-06", "setting a high price for a new product, to make maximum revenue before competing products appear", "market skimming"],
    ["u12-v1-07", "someone who contacts existing and potential customers, and tries to persuade them to buy goods or services", "sales representative"],
    ["u12-v1-08", "the attributes or characteristics of a product, such as size, shape, quality, price, reliability, etc.", "product features"],
    ["u12-v1-09", "the extent to which supply or demand … responds to changes of price", "price elasticity"],
    ["u12-v1-10", "the strategy of setting a low price to try to sell a large volume and increase market share", "market penetration"]
  ].map((r) => ({ id: r[0], definition: r[1], word: r[2] })), {
    unit: 12, exercise: "U12-V1", mode: "match", labelKey: "bvl.prompt.definition",
    option: (r) => r.word, prompt: (r) => r.definition, term: (r) => r.word, answer: (r) => r.word
  });

  addClosed([
    ["u13-v1-01", "companies that design advertising for clients", "advertising agencies"],
    ["u13-v1-02", "the advertising of a particular product or service during a particular period of time", "advertising campaign"],
    ["u13-v1-03", "the statement of objectives that a client works out with an advertising agency", "brief"],
    ["u13-v1-04", "a defined set of customers whose needs a company plans to satisfy", "target customers"],
    ["u13-v1-05", "the amount of money a company plans to spend in developing its advertising and buying media time or space", "budget"],
    ["u13-v1-06", "the choice of where to advertise in order to reach the right people", "media plan"],
    ["u13-v1-07", "choosing to spend the same amount on advertising as one's competitors", "comparative-parity method"],
    ["u13-v1-08", "a small amount of a product given to customers to encourage them to try it", "free samples"],
    ["u13-v1-09", "free advertising, when satisfied customers recommend products to their friends", "word-of-mouth advertising"],
    ["u13-v1-10", "trying to get consumers to forward an online marketing message to other people", "viral marketing"]
  ].map((r) => ({ id: r[0], gloss: r[1], word: r[2] })), {
    unit: 13, exercise: "U13-V1", mode: "quick", labelKey: "bvl.prompt.gloss",
    option: (r) => r.word, prompt: (r) => r.gloss, term: (r) => r.word, answer: (r) => r.word
  });

  const U14_BOX = [
    "commercial banks", "hedge funds", "investment banks", "Islamic banks",
    "non-bank financial intermediaries", "private banks", "stockbrokers"
  ];
  [
    ["u14-r1-01", "commercial banks", "Retail banks or _____ (often called High Street banks in Britain) receive deposits from, and make loans to, individuals and small companies.", "Retail banks or commercial banks (often called High Street banks in Britain) receive deposits from, and make loans to, individuals and small companies."],
    ["u14-r1-02", "investment banks", "_____ work with big companies, giving financial advice, raising capital by issuing stocks or shares and bonds, arranging mergers and takeover bids, and so on.", "investment banks work with big companies, giving financial advice, raising capital by issuing stocks or shares and bonds, arranging mergers and takeover bids, and so on."],
    ["u14-r1-03", "private banks", "Wealthy individuals can also use _____, which provide them with banking and investment services", "Wealthy individuals can also use private banks, which provide them with banking and investment services"],
    ["u14-r1-04", "hedge funds", "and _____, which are private investment funds for wealthy investors …", "and hedge funds, which are private investment funds for wealthy investors …"],
    ["u14-r1-05", "stockbrokers", "… financial services that were previously provided by banks, _____ and insurance companies.", "… financial services that were previously provided by banks, stockbrokers and insurance companies."],
    ["u14-r1-06", "Islamic banks", "_____, in Islamic countries and major financial centres, offer interest-free banking.", "Islamic banks, in Islamic countries and major financial centres, offer interest-free banking."],
    ["u14-r1-07", "non-bank financial intermediaries", "Technically these are not banks but _____.", "Technically these are not banks but non-bank financial intermediaries."]
  ].forEach((r) => {
    questions.push({
      id: r[0], unit: 14, exercise: "U14-R1", mode: "read-fill", kind: "single",
      labelKey: "bvl.prompt.collocation", prompt: r[2], term: r[1],
      options: U14_BOX.slice(), answer: r[1], resolved: r[3]
    });
  });

  addClosed([
    ["u14-v1-01", "money placed in a bank", "deposits"],
    ["u14-v1-02", "a sum of money borrowed from a bank", "loans"],
    ["u14-v1-03", "the money invested in a business", "capital"],
    ["u14-v1-04", "certificates representing part-ownership of a company", "stocks or shares"],
    ["u14-v1-05", "certificates of debt issued by governments or companies to raise money", "bonds"],
    ["u14-v1-06", "when one company combines with another one", "mergers"],
    ["u14-v1-07", "when one company offers to buy or acquire another one", "takeover bids"],
    ["u14-v1-08", "buying and selling stocks or shares for clients", "stockbroking"],
    ["u14-v1-09", "all the investments owned by an individual or organization", "portfolio"],
    ["u14-v1-10", "the profits made on investments", "returns"],
    ["u14-v1-11", "unable to pay debts or continue to do business", "bankrupt"],
    ["u14-v1-12", "the ending or relaxing of legal restrictions", "deregulation"],
    ["u14-v1-13", "a group of companies, operating in different fields, which have joined together", "conglomerates"],
    ["u14-v1-14", "the price paid for borrowing money, paid to the lenders", "interest"]
  ].map((r) => ({ id: r[0], gloss: r[1], word: r[2] })), {
    unit: 14, exercise: "U14-V1", mode: "quick", labelKey: "bvl.prompt.gloss",
    option: (r) => r.word, prompt: (r) => r.gloss, term: (r) => r.word, answer: (r) => r.word
  });

  const U14_NOUNS = [
    "advice", "bonds", "business", "capital", "deposits", "laws", "loans",
    "profits", "interest", "services", "stocks or shares"
  ];
  const U14_ALSO = { issue: ["stocks or shares", "bonds"] };
  [
    ["u14-v2-01", "receive", "deposits"],
    ["u14-v2-02", "make", "loans"],
    ["u14-v2-03", "raise", "capital"],
    ["u14-v2-04", "issue", "stocks or shares"],
    ["u14-v2-05", "issue", "bonds"],
    ["u14-v2-06", "give", "advice"],
    ["u14-v2-07", "pass", "laws"],
    ["u14-v2-08", "pay", "interest"],
    ["u14-v2-09", "charge", "interest"],
    ["u14-v2-10", "share", "profits"],
    ["u14-v2-11", "do", "business"],
    ["u14-v2-12", "offer", "services"],
    ["u14-v2-13", "provide", "services"]
  ].forEach((r) => {
    const blocked = (U14_ALSO[r[1]] || []).filter((n) => n !== r[2]);
    questions.push({
      id: r[0], unit: 14, exercise: "U14-V2", mode: "match", kind: "single",
      labelKey: "bvl.prompt.pair", prompt: r[1] + " _____", term: r[1] + " " + r[2],
      options: U14_NOUNS.filter((n) => blocked.indexOf(n) === -1),
      answer: r[2], resolved: ""
    });
  });

  addClosed([
    ["u14-v3-01", "credit rating", "estimates of people's ability to fulfil their financial commitments"],
    ["u14-v3-02", "default", "failure to repay a loan"],
    ["u14-v3-03", "collateralized", "with property or another asset used as a guarantee of payment"],
    ["u14-v3-04", "cash flow", "the money generated by an investment"],
    ["u14-v3-05", "write off", "cancel a bad debt or a worthless asset from an account"]
  ].map((r) => ({ id: r[0], word: r[1], definition: r[2] })), {
    unit: 14, exercise: "U14-V3", mode: "match", labelKey: "bvl.prompt.word",
    option: (r) => r.definition, prompt: (r) => r.word, term: (r) => r.word, answer: (r) => r.definition
  });

  function unitByNumber(n) {
    for (let i = 0; i < UNITS.length; i++) if (UNITS[i].number === n) return UNITS[i];
    return null;
  }

  function questionsFor(unit, mode) {
    const inUnit = questions.filter((q) => q.unit === unit);
    if (mode === "mixed") return inUnit.slice();
    if (mode === "sort") return [];
    return inUnit.filter((q) => q.mode === mode);
  }

  function isCorrect(question, picks) {
    if (!question) return false;
    if (question.kind === "ordered") {
      if (!Array.isArray(picks) || picks.length !== question.answers.length) return false;
      for (let i = 0; i < question.answers.length; i++) {
        if (picks[i] !== question.answers[i]) return false;
      }
      return true;
    }
    const chosen = Array.isArray(picks) ? picks[0] : picks;
    return chosen === question.answer;
  }

  function answerList(question) {
    if (!question) return [];
    return question.kind === "ordered" ? question.answers.slice() : [question.answer];
  }

  function counts() {
    const out = {};
    UNITS.forEach((u) => {
      out[u.number] = {
        "read-fill": questionsFor(u.number, "read-fill").length,
        match: questionsFor(u.number, "match").length,
        quick: questionsFor(u.number, "quick").length,
        sort: questionsFor(u.number, "sort").length,
        mixed: questionsFor(u.number, "mixed").length
      };
    });
    return out;
  }

  function validate() {
    const errors = [];
    const ids = Object.create(null);
    questions.forEach((q) => {
      if (!q.id || ids[q.id]) errors.push("duplicate or empty id: " + q.id);
      ids[q.id] = 1;
      if (!unitByNumber(q.unit)) errors.push(q.id + " unknown unit");
      if (q.mode !== "read-fill" && q.mode !== "match" && q.mode !== "quick") errors.push(q.id + " bad mode");
      if (!ALLOWED_EXERCISES[q.exercise]) errors.push(q.id + " exercise not verified");
      if (!q.prompt || !q.term) errors.push(q.id + " missing prompt or term");
      if (!Array.isArray(q.options) || q.options.length < 2) errors.push(q.id + " options");
      const seen = Object.create(null);
      q.options.forEach((opt) => {
        if (seen[opt]) errors.push(q.id + " duplicate option");
        seen[opt] = 1;
      });
      answerList(q).forEach((a) => {
        if (q.options.indexOf(a) === -1) errors.push(q.id + " answer not in options: " + a);
      });
      if (q.kind === "ordered" && (!q.answers || q.answers.length < 2)) errors.push(q.id + " ordered");
      const blob = (q.answer || "") + " " + (q.answers || []).join(" ");
      if (/\bdisrupt/.test(blob)) errors.push(q.id + " blocked disrupt form");
      if (q.answer === "shared values") errors.push(q.id + " unofficial key");
    });
    const got = counts();
    Object.keys(EXPECTED).forEach((unit) => {
      ["read-fill", "match", "quick", "sort", "mixed"].forEach((mode) => {
        if (got[unit][mode] !== EXPECTED[unit][mode]) {
          errors.push("count " + unit + " " + mode + " = " + got[unit][mode] + " expected " + EXPECTED[unit][mode]);
        }
      });
    });
    const mixedIds = Object.create(null);
    questions.forEach((q) => {
      const key = q.unit + ":" + q.id;
      if (mixedIds[key]) errors.push("mixed duplicate " + key);
      mixedIds[key] = 1;
    });
    return errors;
  }

  window.EGL_BVL_DATA = {
    units: UNITS,
    questions: questions,
    expected: EXPECTED,
    questionsFor: questionsFor,
    isCorrect: isCorrect,
    answerList: answerList,
    counts: counts,
    validate: validate,
    unitByNumber: unitByNumber
  };
})();
