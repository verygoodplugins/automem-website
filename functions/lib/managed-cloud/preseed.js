function pushMemory(memories, content, importance, tags, type = 'fact') {
  if (!content) {
    return;
  }
  memories.push({
    content,
    importance,
    tags: ['onboarding', ...tags],
    type,
  });
}

function splitTools(answer = '') {
  return String(answer)
    .split(/,|and/gi)
    .map((tool) => tool.trim())
    .filter(Boolean);
}

function inferWorkflowProfile(profile = {}, enrichment = []) {
  const communication = profile.communication?.answer || '';
  const technicalDepth = /staff|principal|senior|architect|expert/i.test(profile.identity?.raw || '')
    ? 'expert'
    : /engineer|developer|product|designer/i.test(profile.identity?.raw || '')
      ? 'senior'
      : 'intermediate';

  return {
    communication_directness: /direct|blunt|challenge/i.test(communication) ? 5 : 3,
    technical_depth: technicalDepth,
    output_format: /table|structured|bullet|outline/i.test(communication) ? 'structured' : 'prose',
    collaboration_style: /pushback|challenge|socratic/i.test(communication) ? 'socratic' : 'collaborative',
    domain_vocabulary: enrichment
      .flatMap((item) => item.title.split(/\s+/))
      .filter((word) => word.length > 4)
      .slice(0, 12),
    detected_tools: splitTools(profile.tools?.answer || ''),
  };
}

export function buildPreseedPayload(profile = {}, enrichmentItems = []) {
  const memories = [];
  const approvedItems = enrichmentItems.filter((item) => item.approved);

  pushMemory(memories, profile.identity?.raw, 0.95, ['identity', 'role']);
  pushMemory(memories, profile.projects?.answer, 0.9, ['projects', 'focus'], 'decision');
  pushMemory(memories, profile.tools?.answer, 0.85, ['tools', 'workflow'], 'pattern');
  pushMemory(memories, profile.communication?.answer, 0.9, ['preferences', 'communication'], 'preference');
  pushMemory(memories, profile.context?.answer, 0.8, ['preferences', 'context'], 'preference');

  for (const item of approvedItems) {
    pushMemory(
      memories,
      `${item.title}: ${item.summary}`,
      0.75,
      ['enrichment', item.source_type],
      'fact',
    );
  }

  const associations = memories
    .map((memory, index) => {
      if (index === 0) {
        return null;
      }
      return {
        from_index: 0,
        to_index: index,
        relationship: 'RELATES_TO',
        strength: 0.7,
      };
    })
    .filter(Boolean);

  const workflow_profile = inferWorkflowProfile(profile, approvedItems);
  return {
    memories,
    associations,
    workflow_profile,
  };
}
