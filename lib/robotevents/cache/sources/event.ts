import { re } from "../../index";

export const eventMeta = async (eventId: number) => {
  return await re.events.eventGetEvent({ id: eventId });
};

export const eventTeams = async (eventId: number) => {
  return await re.depaginate(
    re.events.eventGetTeams({ id: eventId }, re.custom.maxPages),
    re.models.PaginatedTeamFromJSON,
    250,
  );
};

export const eventSkills = async (eventId: number) => {
  return await re.depaginate(
    re.events.eventGetSkills({ id: eventId }, re.custom.maxPages),
    re.models.PaginatedSkillFromJSON,
    250,
  );
};

export const eventAwards = async (eventId: number) => {
  return await re.depaginate(
    re.events.eventGetAwards({ id: eventId }, re.custom.maxPages),
    re.models.PaginatedAwardFromJSON,
    250,
  );
};
