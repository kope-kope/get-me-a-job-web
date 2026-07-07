/**
 * The Berkeley Haas Career Management Group (CMG) resume format,
 * populated with Tosin Oladokun's resume as a concrete example.
 *
 * Referenced from the /example-resume page and linked from the resume
 * onboarding step so classmates can see the target format before
 * uploading their own.
 *
 * To redact for public distribution: replace `header` values with
 * placeholders. Everything else (jobs, education, additional) is
 * already discoverable via LinkedIn / personal site.
 */
export type ExampleResume = {
  header: {
    name: string;
    contact: Array<{ label: string; href?: string }>;
  };
  sections: Array<ExperienceSection | EducationSection | AdditionalSection>;
};

export type ExperienceSection = {
  kind: "experience";
  title: string;
  entries: ExperienceEntry[];
};

export type ExperienceEntry = {
  organization: string;
  location: string;
  dates: string;
  description?: string;
  role: string;
  bullets: string[];
};

export type EducationSection = {
  kind: "education";
  title: string;
  entries: EducationEntry[];
};

export type EducationEntry = {
  school: string;
  location: string;
  dates: string;
  degree: string;
  bullets?: string[];
};

export type AdditionalSection = {
  kind: "additional";
  title: string;
  items: Array<{ label: string; body: string }>;
};

export const EXAMPLE_RESUME: ExampleResume = {
  header: {
    name: "Tosin Oladokun",
    contact: [
      { label: "341-213-8356" },
      { label: "hello@tosinoladokun.com", href: "mailto:hello@tosinoladokun.com" },
      { label: "linkedin.com/in/tosin-oladokun", href: "https://linkedin.com/in/tosin-oladokun" },
      { label: "tosinoladokun.com", href: "https://tosinoladokun.com" },
    ],
  },
  sections: [
    {
      kind: "experience",
      title: "Experience",
      entries: [
        {
          organization: "Amazon, Inc.",
          location: "Seattle, US",
          dates: "May 2025 – August 2025",
          role: "Senior Product Manager-Technical Intern",
          bullets: [
            "Defined the vision for a machine learning-based prediction model to forecast tariff refunds, enabling Amazon's cross-border organization to reduce prices for international customers by 12%.",
            "Developed a data-driven business case by analysing 10K+ export transactions, identifying a $44M annual entitlement from U.S. duty drawback, and securing leadership buy-in to unlock this new revenue stream.",
          ],
        },
        {
          organization: "Future Africa",
          location: "Lagos, NG",
          dates: "April 2022 – August 2024",
          description:
            "Future Africa is a venture capital fund dedicated to Africa's future. First investor in Itana, Africa's first digital jurisdiction enabling technology businesses to operate in Nigeria from anywhere in the world.",
          role: "Product Lead",
          bullets: [
            "Enabled $175K in capital deployment by managing the beta launch of AssetStack, a private investment-as-a-service product, with a 5-person cross-functional team across engineering, design, and legal.",
            "Spearheaded a data unification project post-launch of Itana, working with growth and marketing teams to define attribution metrics for leads, which resulted in a 15% improvement in customer acquisition.",
            "Conceptualised and launched the Itana application for eligible businesses by collaborating directly with policy and regulatory teams to scope out requirements, facilitating the seamless online incorporation of more than 200 technology businesses.",
          ],
        },
        {
          organization: "GetEquity (Techstars '23)",
          location: "Lagos, NG",
          dates: "April 2021 – April 2022",
          description:
            "First fintech startup democratizing private investments for African-focused retail investors and fund managers.",
          role: "Technical Product Manager",
          bullets: [
            "Pioneered the mobile application from 0-to-1, driving $500K in investments from retail investors into 35 African startups by leveraging system design thinking in asset tokenization.",
            "Led the post-launch development of a data dashboard to extract critical user engagement insights utilizing SQL for the growth team that drove a 60% increase in product retention.",
            "Accelerated the development of a new product initiative by pivoting focus from B2C to B2B, completing in 3 weeks by conducting in-depth market and user research and effectively communicating insights to the engineering team through detailed requirement documentation.",
          ],
        },
        {
          organization: "Woven Finance",
          location: "Lagos, NG",
          dates: "December 2019 – April 2021",
          description:
            "Fintech startup backed by the biggest bank in Nigeria, fostering financial inclusion for African businesses through payments and investments.",
          role: "Associate Product Manager",
          bullets: [
            "Launched the beta version of stockbroking-as-a-service infrastructure, driving $25K in transaction volume from ten customers by applying agile project management principles with a team of three contract engineers.",
            "Proposed enhancements to the Nigerian Central Securities Clearing System's data exchange processes, laying the groundwork for more efficient and scalable development, enabling an 80% increase in the Nigerian Stock Exchange's trading volume.",
            "Accelerated bug detection by developing and implementing an uptime testing application using Python.",
          ],
        },
      ],
    },
    {
      kind: "education",
      title: "Education",
      entries: [
        {
          school: "University of California, Berkeley, Haas School of Business",
          location: "Berkeley, US",
          dates: "May 2026",
          degree: "Master of Business Administration",
          bullets: [
            "VP, Technology MBA Association: Built and deployed digital yearbook and class scheduler for classmates.",
            "Co-Founder/President: African Entrepreneurs at Berkeley.",
          ],
        },
        {
          school: "University of Ilorin, School of Engineering and Technology",
          location: "Ilorin, NG",
          dates: "October 2019",
          degree: "Bachelor of Engineering, Chemical Engineering",
        },
      ],
    },
    {
      kind: "additional",
      title: "Additional",
      items: [
        {
          label: "Entrepreneurship",
          body: "Co-Founder, Bluum Finance, API infrastructure for global investing. Former Co-Founder, Fluidcoins (acquired): African crypto infrastructure for stablecoin payments.",
        },
        {
          label: "Certifications & Skills",
          body: "Project Management Professional (PMP)®, currently picking up DevOps/MLOps.",
        },
        {
          label: "Soccer Nerd",
          body: "Play, watch, and be an opinionated commentator on the beautiful game — also, a die-hard Liverpool fan.",
        },
      ],
    },
  ],
};
