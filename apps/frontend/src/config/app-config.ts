import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Discite",
  version: packageJson.version,
  copyright: `© ${currentYear}, Discite.`,
  meta: {
    title: "Discite - Modern Learning Management System",
    description:
      "Discite is a powerful learning management system designed to help you create, manage, and deliver engaging online courses. Track progress, issue certificates, and scale your training programs with ease.",
  },
};
