create or replace view product_review_stats as
select
  p.id as product_id,
  coalesce(round(avg(ur.rating)::numeric, 2), 0) as avg_rating,
  coalesce(count(ur.id), 0) as review_count
from products p
left join user_reviews ur on ur.product_id = p.id
group by p.id;

grant select on product_review_stats to anon, authenticated, service_role;
