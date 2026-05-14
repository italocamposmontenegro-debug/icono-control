import { supabase } from '../lib/supabase';
import {
  ICONIC_PROJECT_ACTIVITIES,
  ICONIC_PROJECT_CAREERS,
  ICONIC_PROJECT_OBJECTIVE,
  ICONIC_PROJECT_TIMELINE_EVENTS,
  LEGACY_ACTIVITY_IDS_TO_REMOVE,
} from '../data/iconicProject2026';
import { mergeMetadataIntoObservations, normalizeText } from '../utils/activityMetadata';

let seedPromise = null;

function sameText(a, b) {
  return normalizeText(a) === normalizeText(b);
}

function findCareer(careers, careerName) {
  const normalized = normalizeText(careerName);
  return careers.find(career =>
    sameText(career.name, careerName) ||
    sameText(career.code, careerName) ||
    normalized.includes(normalizeText(career.name)) ||
    normalizeText(career.name).includes(normalized)
  );
}

function findProfileByEmail(profiles, email) {
  if (!email) return null;
  return profiles.find(profile => sameText(profile.email, email));
}

async function ensureCareers() {
  const { data: careers = [], error } = await supabase
    .from('careers')
    .select('id, name, code');

  if (error) throw error;

  const missing = ICONIC_PROJECT_CAREERS.filter(seedCareer => !findCareer(careers, seedCareer.name));

  if (missing.length) {
    const { error: insertError } = await supabase.from('careers').upsert(missing, { onConflict: 'id' });
    if (insertError) throw insertError;

    const { data: refreshed = [], error: refreshError } = await supabase
      .from('careers')
      .select('id, name, code');

    if (refreshError) throw refreshError;
    return refreshed;
  }

  return careers;
}

async function ensureObjective() {
  const { data: objectives = [], error } = await supabase
    .from('objectives')
    .select('id, title');

  if (error) throw error;

  const existing = objectives.find(objective =>
    objective.id === ICONIC_PROJECT_OBJECTIVE.id || sameText(objective.title, ICONIC_PROJECT_OBJECTIVE.title)
  );

  if (existing) return existing;

  const { data, error: insertError } = await supabase
    .from('objectives')
    .upsert(ICONIC_PROJECT_OBJECTIVE, { onConflict: 'id' })
    .select('id, title')
    .single();

  if (insertError) throw insertError;
  return data;
}

async function ensureTimelineEvents(profileId) {
  const eventIds = ICONIC_PROJECT_TIMELINE_EVENTS.map(event => event.id);
  const { data: existing = [], error } = await supabase
    .from('timeline_events')
    .select('id')
    .in('id', eventIds);

  if (error) throw error;

  const existingIds = new Set(existing.map(event => event.id));
  const missing = ICONIC_PROJECT_TIMELINE_EVENTS
    .filter(event => !existingIds.has(event.id))
    .map(event => ({ ...event, created_by: profileId }));

  if (!missing.length) return 0;

  const { error: insertError } = await supabase.from('timeline_events').insert(missing);
  if (insertError) throw insertError;
  return missing.length;
}

async function deleteIfTableAllows(table) {
  const { error } = await supabase
    .from(table)
    .delete()
    .in('activity_id', LEGACY_ACTIVITY_IDS_TO_REMOVE);

  if (error && error.code !== '42P01') {
    console.warn(`No se pudo limpiar ${table}:`, error);
  }
}

async function removeLegacyActivities() {
  await deleteIfTableAllows('tasks');
  await deleteIfTableAllows('evidence');
  await deleteIfTableAllows('activity_updates');

  const { error } = await supabase
    .from('activities')
    .delete()
    .in('id', LEGACY_ACTIVITY_IDS_TO_REMOVE);

  if (error) {
    console.warn('No se pudieron limpiar actividades legacy:', error);
  }
}

async function runSeed(profile) {
  const careers = await ensureCareers();
  const objective = await ensureObjective();
  await removeLegacyActivities();

  const [{ data: profiles = [], error: profilesError }, { data: existingActivities = [], error: activitiesError }] =
    await Promise.all([
      supabase.from('profiles').select('id, email, full_name'),
      supabase.from('activities').select('id').in('id', ICONIC_PROJECT_ACTIVITIES.map(activity => activity.id)),
    ]);

  if (profilesError) throw profilesError;
  if (activitiesError) throw activitiesError;

  const existingIds = new Set(existingActivities.map(activity => activity.id));
  const missingActivities = ICONIC_PROJECT_ACTIVITIES
    .filter(activity => !existingIds.has(activity.id))
    .map(activity => {
      const career = findCareer(careers, activity.careerName) || findCareer(careers, 'Interdisciplinaria');
      const responsible = findProfileByEmail(profiles, activity.responsibleEmail);

      return {
        id: activity.id,
        title: activity.title,
        description: activity.description,
        objective_id: objective?.id || null,
        career_id: career?.id || null,
        start_date: activity.start_date,
        end_date: activity.end_date,
        status: activity.status,
        priority: activity.priority,
        progress_percent: activity.progress_percent,
        responsible_profile_id: responsible?.id || null,
        internal_assistants_text: activity.internal_assistants_text || '',
        external_assistants_text: activity.external_assistants_text || '',
        observations: mergeMetadataIntoObservations(activity.observations || '', activity.meta),
        created_by: profile.id,
      };
    });

  if (missingActivities.length) {
    const { error: insertError } = await supabase.from('activities').insert(missingActivities);
    if (insertError) throw insertError;
  }

  const timelineCount = await ensureTimelineEvents(profile.id);

  return {
    insertedActivities: missingActivities.length,
    insertedTimelineEvents: timelineCount,
  };
}

export async function ensureIconicProject2026Seed(profile) {
  if (!profile?.id || profile.role !== 'admin_comite') {
    return { skipped: true };
  }

  if (!seedPromise) {
    seedPromise = runSeed(profile).catch(error => {
      console.warn('No se pudo cargar la semilla del Proyecto Iconico 2026:', error);
      return { skipped: true, error };
    });
  }

  return seedPromise;
}
