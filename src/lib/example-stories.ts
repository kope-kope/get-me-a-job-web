/**
 * A small set of STAR stories rendered on /example-stories as a template.
 * Deliberately fictional-but-plausible so a classmate reading them can see
 * the shape without recognising them as anyone's real experience.
 *
 * Each story hits one of the archetypal themes MBA behavioral interviews
 * grind through: leadership without authority, failure / recovery,
 * data-driven decision under ambiguity, cross-functional conflict.
 */

export type ExampleStory = {
  title: string;
  themes: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  takeaway: string;
};

export const EXAMPLE_STORIES: ExampleStory[] = [
  {
    title: "Killing my own feature",
    themes: ["Failure and recovery", "Data-driven decision", "Ownership"],
    situation:
      "At [previous company], I spent two quarters building a referral loop that the growth team was convinced would move signup by 15%. Six weeks after launch it was flat.",
    task:
      "I owned the feature end to end, which meant I owned the decision about whether to keep investing. Continuing meant tying up two engineers for another quarter. Killing it publicly meant admitting the strategy call was wrong.",
    action:
      "I ran a cohort analysis, isolating users exposed to the loop against a hold-out. Lift was 0.4%, not stat sig. I wrote a doc laying out the miss, walked the growth lead through it, and recommended we kill the feature and move both engineers to the checkout redesign. Then I presented the same doc, unedited, to my VP.",
    result:
      "We deprecated the loop within a week. The two engineers shipped a checkout change that moved conversion by 3.1% in the following month. My VP later told me it was the reason he trusted me with the harder Q4 project.",
    takeaway:
      "The best product managers I know are willing to kill their own work faster than anyone else in the room. Owning the miss cost less than defending it.",
  },
  {
    title: "The compliance conversation nobody wanted",
    themes: ["Leading without authority", "Cross-functional influence", "Regulatory context"],
    situation:
      "We were three weeks from launching a payments product in a market where the licensing regime had just changed. Legal was busy with a separate deal, engineering assumed we were compliant, and the CEO wanted the launch date held.",
    task:
      "I wasn't in the compliance chain of command, but I was the only PM who'd read the updated regulation. If we shipped and the interpretation was wrong, we'd have to unwind $300K of onboarded customer capital.",
    action:
      "I mapped the specific clauses in the regulation to specific parts of the product surface, wrote a two-page memo, and walked into the CEO's office with the general counsel of a partner bank on the phone. I didn't ask for the launch to be delayed. I laid out the two scenarios: ship on the current interpretation, or take four days to have the partner's counsel co-sign our reading first.",
    result:
      "We took the four days. The partner counsel flagged one clause we'd missed and we quietly restructured a settlement flow before launch. The product shipped clean; three months later a competitor launched the equivalent flow the way we'd almost done it and got a cease-and-desist.",
    takeaway:
      "In regulated products, the right move is often to slow down 20% before a decision that's expensive to reverse. The hard part isn't the analysis — it's being the person who says 'wait' when everyone else is moving.",
  },
  {
    title: "Rebuilding a team from a scale of 3 to 10",
    themes: ["Team building", "Ambiguity", "Prioritization"],
    situation:
      "Six months after I joined [company] as the first PM, we closed a Series B. The plan was to grow the product org from 3 to 10 in two quarters. I inherited zero hiring rubric, one unfilled backfill from the previous PM, and a leadership team that had never scaled before.",
    task:
      "I owned defining what 'good PM' meant here, building the pipeline, and closing hires without slowing the roadmap.",
    action:
      "I wrote a one-page rubric that scored candidates on three axes we were actually short on: quantitative reasoning, product taste, and comfort with ambiguity. I turned it into a scoring form so any interviewer could apply it consistently. Then I front-loaded my calendar with 20 first-round calls a week for two months, protected 15% of my week for one 1:1 with each new hire during their first 30 days, and killed two lower-priority initiatives outright to keep our shipping cadence.",
    result:
      "We closed 7 of the 7 hires we wanted, with 6 still on the team a year later. Two ended up promoted. Shipping cadence stayed flat during the ramp because we killed the right things.",
    takeaway:
      "The hardest part of scaling a team isn't the sourcing, it's the decisions about what NOT to work on so hiring doesn't cost you the roadmap.",
  },
  {
    title: "Disagreeing with my manager on the roadmap",
    themes: ["Conflict", "Direct communication", "Prioritization"],
    situation:
      "In Q2 my manager wanted the team to build an internal admin dashboard the sales org was asking for. I thought we should build a self-serve onboarding flow that had been in the backlog for six months.",
    task:
      "I had to make a real recommendation, not diplomatically split the difference. If sales didn't get their dashboard, they'd lose confidence in the product team. If we didn't ship self-serve, our conversion rate was going to keep bleeding.",
    action:
      "I built a two-page comparison: what shipping each meant for revenue over the next two quarters, using our funnel data plus rough estimates from sales. Self-serve came out at ~4x the revenue impact. Instead of just sending the doc, I set up a 45-minute session with my manager and the head of sales together. I walked through the numbers, then said 'I want to ship self-serve first — here's what we can do to make the sales team's life better in the interim'.",
    result:
      "We shipped self-serve that quarter and it lifted trial-to-paid by 18%. In the interim, sales got a stripped-down version of the dashboard built by one engineer in a week. My manager later told me she'd been on the fence and the direct recommendation gave her cover to make the call.",
    takeaway:
      "Managers usually appreciate a clear recommendation more than a well-hedged 'here are the options.' You just have to bring the work.",
  },
];
