/**
 * @fileoverview Servicio GraphQL para GitHub Projects v2.
 */

import { githubGraphql } from '@/lib/github/graphql-client';
import type { GithubProjectSummary } from '@/lib/types/github-export';

export interface RepositoryInfo {
  id: string;
  ownerId: string;
  ownerLogin: string;
  ownerType: 'User' | 'Organization';
}

export interface ProjectFieldIds {
  storyPoints?: string;
  priority?: string;
  priorityOptions?: Record<string, string>;
  epic?: string;
  sprint?: string;
  status?: string;
  statusOptions?: Record<string, string>;
}

interface ProjectFieldNode {
  __typename: string;
  id: string;
  name: string;
  options?: Array<{ id: string; name: string }>;
}

export async function getRepositoryInfo(
  accessToken: string,
  owner: string,
  repo: string
): Promise<RepositoryInfo> {
  const data = await githubGraphql<{
    repository: {
      id: string;
      owner: {
        __typename: 'User' | 'Organization';
        id: string;
        login: string;
      };
    };
  }>(
    accessToken,
    `query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        id
        owner {
          __typename
          id
          login
        }
      }
    }`,
    { owner, repo }
  );

  const ownerNode = data.repository.owner;
  return {
    id: data.repository.id,
    ownerId: ownerNode.id,
    ownerLogin: ownerNode.login,
    ownerType: ownerNode.__typename,
  };
}

export async function listProjectsForOwner(
  accessToken: string,
  ownerLogin: string,
  ownerType: 'User' | 'Organization'
): Promise<GithubProjectSummary[]> {
  const query =
    ownerType === 'Organization'
      ? `query($login: String!) {
          organization(login: $login) {
            projectsV2(first: 50) {
              nodes { id number title url }
            }
          }
        }`
      : `query($login: String!) {
          user(login: $login) {
            projectsV2(first: 50) {
              nodes { id number title url }
            }
          }
        }`;

  const data = await githubGraphql<{
    user?: { projectsV2: { nodes: Array<{ id: string; number: number; title: string; url: string }> } };
    organization?: { projectsV2: { nodes: Array<{ id: string; number: number; title: string; url: string }> } };
  }>(accessToken, query, { login: ownerLogin });

  const nodes = data.user?.projectsV2.nodes ?? data.organization?.projectsV2.nodes ?? [];
  return nodes.map((node) => ({
    id: node.id,
    number: node.number,
    title: node.title,
    url: node.url,
    owner: ownerLogin,
    ownerType,
  }));
}

export async function createProjectV2(
  accessToken: string,
  ownerId: string,
  title: string,
  repositoryId?: string
): Promise<{ id: string; url: string; number: number }> {
  const data = await githubGraphql<{
    createProjectV2: {
      projectV2: { id: string; url: string; number: number };
    };
  }>(
    accessToken,
    `mutation($ownerId: ID!, $title: String!, $repositoryId: ID) {
      createProjectV2(input: { ownerId: $ownerId, title: $title, repositoryId: $repositoryId }) {
        projectV2 { id url number }
      }
    }`,
    { ownerId, title, repositoryId }
  );

  return data.createProjectV2.projectV2;
}

export async function getProjectFields(
  accessToken: string,
  projectId: string
): Promise<ProjectFieldNode[]> {
  const data = await githubGraphql<{
    node: {
      fields: { nodes: ProjectFieldNode[] };
    };
  }>(
    accessToken,
    `query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 50) {
            nodes {
              __typename
              ... on ProjectV2Field { id name }
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
              ... on ProjectV2IterationField { id name }
            }
          }
        }
      }
    }`,
    { projectId }
  );

  return data.node?.fields?.nodes ?? [];
}

function findFieldByName(fields: ProjectFieldNode[], name: string): ProjectFieldNode | undefined {
  const normalized = name.toLowerCase();
  return fields.find((field) => field.name.toLowerCase() === normalized);
}

export function resolveProjectFieldIds(fields: ProjectFieldNode[]): ProjectFieldIds {
  const storyPointsField = findFieldByName(fields, 'Story Points');
  const priorityField = findFieldByName(fields, 'Priority');
  const epicField = findFieldByName(fields, 'Epic');
  const sprintField = findFieldByName(fields, 'Sprint');
  const statusField = findFieldByName(fields, 'Status');

  const priorityOptions: Record<string, string> = {};
  if (priorityField?.options) {
    for (const option of priorityField.options) {
      priorityOptions[option.name.toLowerCase()] = option.id;
    }
  }

  const statusOptions: Record<string, string> = {};
  if (statusField?.options) {
    for (const option of statusField.options) {
      statusOptions[option.name.toLowerCase()] = option.id;
    }
  }

  return {
    storyPoints: storyPointsField?.id,
    priority: priorityField?.id,
    priorityOptions,
    epic: epicField?.id,
    sprint: sprintField?.id,
    status: statusField?.id,
    statusOptions,
  };
}

export async function setupProjectCustomFields(
  accessToken: string,
  projectId: string,
  priorityOptionNames: string[]
): Promise<ProjectFieldIds> {
  await createNumberField(accessToken, projectId, 'Story Points');
  await createTextField(accessToken, projectId, 'Epic');
  await createTextField(accessToken, projectId, 'Sprint');
  await createSingleSelectField(accessToken, projectId, 'Priority', priorityOptionNames);

  const fields = await getProjectFields(accessToken, projectId);
  return resolveProjectFieldIds(fields);
}

async function createNumberField(
  accessToken: string,
  projectId: string,
  name: string
): Promise<void> {
  await githubGraphql(
    accessToken,
    `mutation($projectId: ID!, $name: String!) {
      createProjectV2Field(input: { projectId: $projectId, name: $name, dataType: NUMBER }) {
        projectV2Field { ... on ProjectV2Field { id } }
      }
    }`,
    { projectId, name }
  );
}

async function createTextField(
  accessToken: string,
  projectId: string,
  name: string
): Promise<void> {
  await githubGraphql(
    accessToken,
    `mutation($projectId: ID!, $name: String!) {
      createProjectV2Field(input: { projectId: $projectId, name: $name, dataType: TEXT }) {
        projectV2Field { ... on ProjectV2Field { id } }
      }
    }`,
    { projectId, name }
  );
}

async function createSingleSelectField(
  accessToken: string,
  projectId: string,
  name: string,
  options: string[]
): Promise<void> {
  await githubGraphql(
    accessToken,
    `mutation($projectId: ID!, $name: String!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
      createProjectV2Field(
        input: {
          projectId: $projectId
          name: $name
          dataType: SINGLE_SELECT
          singleSelectOptions: $options
        }
      ) {
        projectV2Field { ... on ProjectV2SingleSelectField { id } }
      }
    }`,
    {
      projectId,
      name,
      options: options.map((optionName, index) => ({
        name: optionName,
        color: ['GRAY', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'RED', 'PINK', 'PURPLE'][index % 8],
        description: optionName,
      })),
    }
  );
}

export async function addIssueToProject(
  accessToken: string,
  projectId: string,
  contentNodeId: string
): Promise<string> {
  const data = await githubGraphql<{
    addProjectV2ItemById: { item: { id: string } };
  }>(
    accessToken,
    `mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }`,
    { projectId, contentId: contentNodeId }
  );

  return data.addProjectV2ItemById.item.id;
}

export async function updateProjectItemNumberField(
  accessToken: string,
  projectId: string,
  itemId: string,
  fieldId: string,
  value: number
): Promise<void> {
  await githubGraphql(
    accessToken,
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: Float!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { number: $value }
        }
      ) {
        projectV2Item { id }
      }
    }`,
    { projectId, itemId, fieldId, value }
  );
}

export async function updateProjectItemTextField(
  accessToken: string,
  projectId: string,
  itemId: string,
  fieldId: string,
  value: string
): Promise<void> {
  await githubGraphql(
    accessToken,
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { text: $value }
        }
      ) {
        projectV2Item { id }
      }
    }`,
    { projectId, itemId, fieldId, value }
  );
}

export async function updateProjectItemSelectField(
  accessToken: string,
  projectId: string,
  itemId: string,
  fieldId: string,
  optionId: string
): Promise<void> {
  await githubGraphql(
    accessToken,
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }
      ) {
        projectV2Item { id }
      }
    }`,
    { projectId, itemId, fieldId, optionId }
  );
}

export async function getProjectUrl(
  accessToken: string,
  projectId: string
): Promise<string> {
  const data = await githubGraphql<{
    node: { url: string };
  }>(
    accessToken,
    `query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 { url }
      }
    }`,
    { projectId }
  );

  return data.node.url;
}
