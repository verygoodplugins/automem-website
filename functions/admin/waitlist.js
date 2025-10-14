// Admin endpoint to view waitlist data
// Protected with a simple token check

export async function onRequestGet({ request, env }) {
  // Authorization: prefer Bearer token header, fallback to query param for compatibility
  const url = new URL(request.url);
  const authHeader = request.headers.get('authorization') || '';
  const headerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : null;
  const queryToken = url.searchParams.get('token');
  const token = headerToken || queryToken;

  if (!token || token !== env.ADMIN_TOKEN) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { results } = await env.D1.prepare(
      'SELECT email, source, created_at FROM waitlist ORDER BY created_at DESC LIMIT 1000'
    ).all();

    const stats = await env.D1.prepare(
      'SELECT * FROM waitlist_stats'
    ).first();

    return new Response(JSON.stringify({
      stats,
      signups: results
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Admin error:', error);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Export waitlist as CSV
export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const authHeader = request.headers.get('authorization') || '';
  const headerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : null;
  const queryToken = url.searchParams.get('token');
  const token = headerToken || queryToken;

  if (!token || token !== env.ADMIN_TOKEN) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { results } = await env.D1.prepare(
      'SELECT email, source, created_at FROM waitlist ORDER BY created_at DESC'
    ).all();

    // Convert to CSV
    const csv = [
      'Email,Source,Signup Date',
      ...results.map(row => 
        `"${row.email}","${row.source}","${row.created_at}"`
      )
    ].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="automem-waitlist.csv"'
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response('Export failed', { status: 500 });
  }
}
