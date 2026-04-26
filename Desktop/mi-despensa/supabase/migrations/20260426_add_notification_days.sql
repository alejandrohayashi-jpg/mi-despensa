alter table hogares
  add column if not exists notification_days_before integer not null default 3;
