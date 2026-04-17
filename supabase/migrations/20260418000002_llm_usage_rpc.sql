create or replace function increment_llm_usage(
  p_day date,
  p_provider text,
  p_model text,
  p_requests bigint,
  p_prompt_tokens bigint,
  p_completion_tokens bigint
) returns void language sql as $$
  insert into llm_usage (day, provider, model, request_count, prompt_tokens, completion_tokens)
  values (p_day, p_provider, p_model, p_requests, p_prompt_tokens, p_completion_tokens)
  on conflict (day, provider, model) do update set
    request_count = llm_usage.request_count + excluded.request_count,
    prompt_tokens = llm_usage.prompt_tokens + excluded.prompt_tokens,
    completion_tokens = llm_usage.completion_tokens + excluded.completion_tokens;
$$;
