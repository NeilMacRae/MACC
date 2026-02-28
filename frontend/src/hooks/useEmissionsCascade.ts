/**
 * useEmissionsCascade — TanStack Query hooks for the guided cascade
 * source-selection endpoints.
 *
 * Cascade flow:
 *   1. useCascadeScopes()           → pick a scope
 *   2. useCascadeQuestionGroups()   → pick a question_group
 *   3. useCascadeQuestions()        → pick a question
 *   4. useCascadeActivities()       → pick an activity
 *   5. useCascadeCompanyUnits()     → multi-select company units
 *      └→ collect emission_source_ids for InitiativeCreate
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "../services/api";
import type {
  CascadeActivityResponse,
  CascadeCompanyUnitResponse,
  CascadeQuestionGroupResponse,
  CascadeQuestionResponse,
  CascadeScopeResponse,
} from "../types/initiatives";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const cascadeKeys = {
  all: ["cascade"] as const,
  scopes: (year?: number, mft?: string) =>
    [...cascadeKeys.all, "scopes", year, mft] as const,
  questionGroups: (scope: number, year?: number, mft?: string) =>
    [...cascadeKeys.all, "questionGroups", scope, year, mft] as const,
  questions: (scope: number, qg: string, year?: number, mft?: string) =>
    [...cascadeKeys.all, "questions", scope, qg, year, mft] as const,
  activities: (scope: number, qg: string, question: string, year?: number, mft?: string) =>
    [...cascadeKeys.all, "activities", scope, qg, question, year, mft] as const,
  companyUnits: (
    activity: string,
    scope: number,
    qg: string,
    question: string,
    year?: number,
    mft?: string,
  ) =>
    [
      ...cascadeKeys.all,
      "companyUnits",
      activity,
      scope,
      qg,
      question,
      year,
      mft,
    ] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

interface BaseParams {
  year?: number;
  market_factor_type?: string;
}

export function useCascadeScopes(
  params: BaseParams = {},
): UseQueryResult<CascadeScopeResponse> {
  const { year, market_factor_type = "Location" } = params;
  return useQuery({
    queryKey: cascadeKeys.scopes(year, market_factor_type),
    queryFn: () =>
      api.get<CascadeScopeResponse>("/emissions/cascade/scopes", {
        year,
        market_factor_type,
      }),
  });
}

export function useCascadeQuestionGroups(
  scope: number | null,
  params: BaseParams = {},
): UseQueryResult<CascadeQuestionGroupResponse> {
  const { year, market_factor_type = "Location" } = params;
  return useQuery({
    queryKey: cascadeKeys.questionGroups(scope ?? -1, year, market_factor_type),
    queryFn: () =>
      api.get<CascadeQuestionGroupResponse>("/emissions/cascade/question-groups", {
        scope: scope!,
        year,
        market_factor_type,
      }),
    enabled: scope !== null,
  });
}

export function useCascadeQuestions(
  scope: number | null,
  questionGroup: string | null,
  params: BaseParams = {},
): UseQueryResult<CascadeQuestionResponse> {
  const { year, market_factor_type = "Location" } = params;
  return useQuery({
    queryKey: cascadeKeys.questions(
      scope ?? -1,
      questionGroup ?? "",
      year,
      market_factor_type,
    ),
    queryFn: () =>
      api.get<CascadeQuestionResponse>("/emissions/cascade/questions", {
        scope: scope!,
        question_group: questionGroup!,
        year,
        market_factor_type,
      }),
    enabled: scope !== null && questionGroup !== null,
  });
}

export function useCascadeActivities(
  scope: number | null,
  questionGroup: string | null,
  question: string | null,
  params: BaseParams = {},
): UseQueryResult<CascadeActivityResponse> {
  const { year, market_factor_type = "Location" } = params;
  return useQuery({
    queryKey: cascadeKeys.activities(
      scope ?? -1,
      questionGroup ?? "",
      question ?? "",
      year,
      market_factor_type,
    ),
    queryFn: () =>
      api.get<CascadeActivityResponse>("/emissions/cascade/activities", {
        scope: scope!,
        question_group: questionGroup!,
        question: question!,
        year,
        market_factor_type,
      }),
    enabled: scope !== null && questionGroup !== null && question !== null,
  });
}

export function useCascadeCompanyUnits(
  activity: string | null,
  scope: number | null,
  questionGroup: string | null,
  question: string | null,
  params: BaseParams = {},
): UseQueryResult<CascadeCompanyUnitResponse> {
  const { year, market_factor_type = "Location" } = params;
  return useQuery({
    queryKey: cascadeKeys.companyUnits(
      activity ?? "",
      scope ?? -1,
      questionGroup ?? "",
      question ?? "",
      year,
      market_factor_type,
    ),
    queryFn: () =>
      api.get<CascadeCompanyUnitResponse>("/emissions/cascade/company-units", {
        activity: activity!,
        scope: scope!,
        question_group: questionGroup!,
        question: question!,
        year,
        market_factor_type,
      }),
    enabled:
      activity !== null &&
      scope !== null &&
      questionGroup !== null &&
      question !== null,
  });
}
