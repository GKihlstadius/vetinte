alter table products add column category_path text;

update products set category_path = 'audio/headphones/' || category where category_path is null;

alter table products alter column category_path set not null;

create index idx_products_category_path on products (category_path);

alter table products drop constraint products_category_check;
alter table products add constraint products_category_check
  check (category_path ~ '^[a-z0-9_-]+(/[a-z0-9_-]+)*$');
