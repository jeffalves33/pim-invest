-- Gerado por scripts/ficha-to-sql.ts — rode no SQL Editor do Supabase depois do schema.sql
-- e depois de criar sua conta pelo app. Pode rodar de novo: não duplica.

-- BBAS3 — Banco do Brasil S.A. · tese v1 (2026-11-17)
do $pim$
declare
  v_user   uuid := (select id from auth.users order by created_at limit 1);
  v_asset  uuid;
  v_thesis uuid;
begin
  if v_user is null then
    raise exception 'Nenhum usuário em auth.users. Crie sua conta pelo app antes de rodar este seed.';
  end if;

  insert into public.assets (user_id, ticker, name, related_tickers, asset_class, sector, category, market, currency, country, website, ri_site, description, phase, current_price, price_date, price_source, market_cap, price_updated_at)
  values (v_user, 'BBAS3', 'Banco do Brasil S.A.', 'BDORY (ADR nível I, EUA); BBSE3 (BB Seguridade, controlada a 68,26%)', 'acao', 'Financeiro — Bancos', 'Banco múltiplo, sociedade de economia mista controlada pela União; perfil de valor', 'B3 — Novo Mercado', 'BRL', 'Brasil', 'https://www.bb.com.br', 'https://ri.bb.com.br', 'O Banco do Brasil é um banco múltiplo fundado em 1808, controlado pela União, que detém 50% das ações; os outros 49,6% são negociados na B3. É o segundo maior banco do país em ativos, com R$ 2,5 trilhões, uma carteira de crédito de R$ 1,3 trilhão, 3.909 agências e cerca de 83 mil funcionários.

O banco ganha dinheiro principalmente com a diferença entre os juros que cobra nos empréstimos e o custo de captar recursos de clientes e do mercado. Essa margem financeira somou R$ 80,9 bilhões nos nove primeiros meses de 2026. A segunda fonte são tarifas e serviços, como contas, cartões, consórcios e gestão de fundos (R$ 27,2 bilhões no período). A terceira é a participação em empresas do grupo, como BB Seguridade, Banco Votorantim e Banco Patagonia.

A carteira é dividida em três partes de tamanho parecido: pessoa física (R$ 357,7 bilhões, sobretudo consignado), empresas e governo (R$ 464,4 bilhões) e agronegócio (R$ 403,6 bilhões). É o maior financiador do agro brasileiro, com 47,7% do crédito rural do sistema, e líder em consignado (19,5%) e em gestão de recursos de terceiros (22,4%).

Por ser estatal, o banco também executa políticas públicas, como o Plano Safra e programas de renegociação de dívidas rurais, o que influencia sua rentabilidade e sua política de dividendos.', 'f3', 14.84, '2026-11-17', 'análise (Money Times / Investidor10)', 84700000000, now())
  on conflict (user_id, ticker) do update set name = excluded.name, related_tickers = excluded.related_tickers, asset_class = excluded.asset_class, sector = excluded.sector, category = excluded.category, market = excluded.market, currency = excluded.currency, country = excluded.country, website = excluded.website, ri_site = excluded.ri_site, description = excluded.description, phase = excluded.phase, current_price = excluded.current_price, price_date = excluded.price_date, price_source = excluded.price_source, market_cap = excluded.market_cap
  returning id into v_asset;

  if exists (select 1 from public.theses where asset_id = v_asset and version = 1) then
    raise notice 'BBAS3: tese v1 já existe; nada foi inserido.';
    return;
  end if;

  insert into public.theses (user_id, asset_id, version, status, analysis_date, horizon, philosophy, next_review, price_ref_date, last_balance, objective, data_sources, opportunity, why_appreciate, invalidation, price_at_analysis, fair_value_pess, fair_value_base, fair_value_opt, safety_margin, max_buy_price, max_buy_manual, methodology, assumptions, entry_condition, max_contributions, first_purchase_plan, additional_purchase_criteria, no_buy_conditions, reduce_conditions, full_sell_conditions, hold_after_target, classification, quality, price_attractiveness, overall_risk, confidence, justification, limitations, dossier_url)
  values (v_user, v_asset, 1, 'current',
    '2026-11-17',
    '3 a 5 anos',
    'Value',
    '2027-02-19',
    '2026-11-17',
    '30/09/2026 (3T26, divulgado em 11/11/2026)',
    'Valorização pela normalização do ROE após o ciclo de inadimplência do agro; dividendos em segundo plano, com payout reduzido a 25%.',
    'Kit do investidor 3T26 do BB (sumário, análise do desempenho, séries históricas, apresentação); sumário 1T26; relatório Ticker Wealth 3T26 (conferido); Genial; BTG; InfoMoney; Bloomberg via InvestNews; Tesouro Nacional; Copom. Cotação: Money Times e Investidor10.',
    'Comprar uma das franquias bancárias mais eficientes do país perto do fundo de um ciclo de crédito, quando o mercado paga menos da metade do patrimônio. Ainda não há oportunidade: o pico da inadimplência não foi confirmado, o comando do banco pode mudar e o capital está abaixo da referência interna. A entrada só faz sentido abaixo de R$ 12,60 e com sinais concretos de melhora.',
    'A receita continua crescendo (margem financeira +7,4% e serviços +4,8% em 9M26) e a eficiência segue entre as melhores do setor. O que derrubou o lucro foi o custo do crédito, concentrado em safras antigas do agro. As safras contratadas após julho de 2025 têm pontualidade de 91% e cerca de 80% da safra 2026/27 tem alienação fiduciária. Se o custo do crédito voltar de R$ 80 bilhões para R$ 50 a 55 bilhões por ano, o lucro volta para mais de R$ 20 bilhões e o ROE para 12% a 14%. Queda da Selic e venda de participações para reforçar capital aceleram esse caminho.',
    'Inadimplência sem pico em 2027, com custo do crédito trimestral acima de R$ 24 bilhões; Capital Principal abaixo de 10% ou anúncio de aumento de capital; nova renegociação rural imposta ao banco ou presidente nomeado para afrouxar a cobrança; cobertura de 90 dias abaixo de 120%; inadimplência +90 dias acima de 7%.',
    14.84,
    12,
    18,
    30,
    30,
    12.6,
    false,
    'Lucro residual (principal), conferido por P/VP justificado (Gordon) e P/L sobre lucro normalizado de 2028.',
    'Valor patrimonial inicial de R$ 31,63 por ação. Base: ROE de 8,5% em 2027, 11% em 2028 e 13% a partir de 2029; custo de capital de 17% (NTN-B 2035 de 7,85% mais inflação e prêmio de banco estatal); crescimento de longo prazo de 6%; payout de 25% a 35%; lucro implícito de R$ 15,3 bi em 2027. Pessimista: ROE de 7%, 9% e 10%, longo prazo de 11%, custo de capital de 18%. Otimista: ROE de 11%, 14% e 15%, longo prazo de 16%, custo de capital de 16%. Cada ponto no custo de capital move o valor base em cerca de R$ 2; cada ponto no ROE de longo prazo, em cerca de R$ 2,20. Margem de 30% (acima dos 20% padrão) por lucro ainda em queda, risco de troca de comando e capital apertado.',
    'Cotação entre R$ 11,50 e R$ 12,60, com pelo menos um trimestre de queda na formação de inadimplência agro, Capital Principal igual ou superior a 10,5% e nenhum gatilho de invalidação rompido.',
    null,
    'Nenhuma. Aguardando preço e sinais de pico; alerta em R$ 12,60.',
    'Reavaliar a tese a cada compra. Reforçar só abaixo de R$ 12,60 e depois de dois trimestres seguidos de queda na formação de inadimplência. Limitar a posição a um peso compatível com risco alto. Não fazer preço médio só porque caiu.',
    'Nova medida de renegociação rural imposta ao banco; presidente nomeado sem perfil técnico; anúncio de aumento de capital; formação de inadimplência ainda em alta; custo do crédito trimestral acima de R$ 24 bilhões.',
    'Cotação acima de R$ 18,00 sem melhora dos fundamentos; Capital Principal entre 10,0% e 10,5% por dois trimestres; ROE trimestral sem trajetória de alta ao longo de 2027.',
    'Qualquer gatilho de invalidação rompido; cotação acima de R$ 26,00 sem revisão do valor justo para cima.',
    'Se o valor justo for revisto para cima por queda comprovada da inadimplência em dois trimestres, ROE trimestral acima de 13%, retomada do payout de 40% ou venda de participações que reforce o capital.',
    'observacao',
    'medio',
    'medio',
    'alto',
    'medio',
    'Não comprar agora. A franquia é boa, mas o patrimônio rende 7,5% e custa cerca de 17%, então o desconto sobre o patrimônio é em boa parte justo. O lucro ainda não parou de cair, a inadimplência se espalhou para pessoa física, o capital está abaixo da referência interna e o comando pode mudar. O preço atual está acima do preço máximo de compra de R$ 12,60 e o ganho esperado até o valor justo base de R$ 18,00 não compensa a perda possível no cenário pessimista de R$ 12,00. Aguardar o comando definido, o resultado do 4T26, o guidance de 2027 e o efeito da Res. 4.966 no capital.',
    'Valor justo muito sensível ao ROE de longo prazo e ao custo de capital; tamanho dos impactos regulatórios de 2027 a 2029 não divulgado; proventos de 2021 e 2022 estimados pelo payout; cotação de 17/11 com divergência entre fontes (R$ 14,62 a R$ 14,84); teleconferência do 3T26 não analisada diretamente; troca de presidente noticiada por fontes, sem confirmação oficial.',
    'https://claude.ai/artifact/Hyswgq7hRK7iZeDUpKaX8c'
  )
  returning id into v_thesis;

  insert into public.thesis_indicators (user_id, thesis_id, name, value, period, note, is_custom, sort) values
    (v_user, v_thesis, 'P/L', 8.5, '2026E', 'ponto médio do guidance (R$ 10 bi); LTM ajustado 5,9; 2027E BTG 5,6', false, 0),
    (v_user, v_thesis, 'P/VP', 0.47, 'set/26', 'VPA R$ 31,63; mínima da série; 0,57 sobre o Capital Principal', false, 1),
    (v_user, v_thesis, 'ROE', 7.5, 'LTM', 'ajustado; 9M26 6,2; 3T26 2,8; média 2022-2024 de 21', false, 2),
    (v_user, v_thesis, 'ROIC', null, null, 'não se aplica a bancos', false, 3),
    (v_user, v_thesis, 'EV/EBITDA', null, null, 'não se aplica a bancos', false, 4),
    (v_user, v_thesis, 'Dívida líquida/EBITDA', null, null, 'não se aplica a bancos; ver Capital Principal', false, 5),
    (v_user, v_thesis, 'Margem líquida', null, null, 'não se aplica a bancos; ver ROE', false, 6),
    (v_user, v_thesis, 'CAGR da receita', 14.8, '2021-2025', 'margem financeira bruta; guidance 2026 de +2,5 a +4,5', false, 7),
    (v_user, v_thesis, 'Dividend Yield', 4.1, 'data-com 12 meses', 'R$ 0,61 por ação; esperado 2026 de R$ 0,39 a 0,48 por ação; 2027 condicionado ao capital', false, 8),
    (v_user, v_thesis, 'Capital Principal (CET1)', 10.8, 'set/26', 'mínimo regulatório 8,0; referência interna 11,0', true, 9),
    (v_user, v_thesis, 'Inadimplência +90 dias', 6.08, 'set/26', 'agro 6,92; PF 9,14; PJ 3,44', true, 10),
    (v_user, v_thesis, 'Custo do crédito sobre carteira', 7.14, '3T26 anualizado', 'guidance 2026 de R$ 80 a 83 bi', true, 11),
    (v_user, v_thesis, 'Índice de eficiência', 28.5, '12 meses até set/26', '3T26 de 30,3', true, 12);

  insert into public.thesis_triggers (user_id, thesis_id, indicator, condition, limit_value, current_value, value_date, sort) values
    (v_user, v_thesis, 'Inadimplência +90 dias', 'gt', 7, 6.08, '2026-09-30', 0),
    (v_user, v_thesis, 'Custo do crédito trimestral (R$ bilhões)', 'gt', 24, 21.2, '2026-09-30', 1),
    (v_user, v_thesis, 'Capital Principal (CET1)', 'lt', 10, 10.8, '2026-09-30', 2),
    (v_user, v_thesis, 'Índice de cobertura 90 dias', 'lt', 120, 137.8, '2026-09-30', 3),
    (v_user, v_thesis, 'Inadimplência agro +90 dias', 'gt', 8, 6.92, '2026-09-30', 4);

  insert into public.thesis_events (user_id, thesis_id, event_date, description) values
    (v_user, v_thesis, '2027-01-01', 'fim dos regimes transitórios da Res. CMN 4.966 (efeito no capital)'),
    (v_user, v_thesis, '2027-01-05', 'posse do novo mandato presidencial; definição do comando do BB'),
    (v_user, v_thesis, '2027-02-17', 'anúncio do complemento do dividendo de 2026'),
    (v_user, v_thesis, '2027-03-10', 'pagamento do complemento do dividendo de 2026');

  insert into public.thesis_risks (user_id, thesis_id, description, category, probability, impact, notes, sort) values
    (v_user, v_thesis, 'Inadimplência agro sem pico em 2027', 'Crédito', 'medio', 'alto', 'Monitorar a formação de inadimplência agro (R$ 14,7 bi no 3T26) e a pontualidade das safras novas. Invalida a tese.', 0),
    (v_user, v_thesis, 'Interferência política e troca de comando', 'Político', 'alto', 'alto', 'Governo avalia substituir a presidente por nome ligado ao agro. Monitorar a nomeação e novas medidas provisórias de crédito rural. Invalida a tese se houver afrouxamento da cobrança.', 1),
    (v_user, v_thesis, 'Insuficiência de capital', 'Financeiro', 'medio', 'alto', 'CET1 de 10,80% com impactos regulatórios previstos de 2027 a 2029. Pode zerar dividendos de 2027 ou exigir aumento de capital. Invalida a tese abaixo de 10%.', 2),
    (v_user, v_thesis, 'Contaminação da carteira de pessoa física', 'Crédito', 'medio', 'medio', 'Inadimplência PF de 9,14%; monitorar consignado privado (R$ 12,3 bi) e formação de inadimplência PF.', 3),
    (v_user, v_thesis, 'Compressão da margem financeira', 'Operacional', 'alto', 'medio', 'Guidance de margem cortado para +2,5% a 4,5% em 2026; carteira deve encolher. Monitorar margem trimestral e spread.', 4),
    (v_user, v_thesis, 'Juros altos por mais tempo', 'Macroeconômico', 'medio', 'medio', 'Selic de 13,75% mantida em 04/11/2026. Cada ponto no custo de capital tira cerca de R$ 2 do valor justo.', 5),
    (v_user, v_thesis, 'Realização dos créditos tributários', 'Contábil', 'baixo', 'alto', 'R$ 104,8 bi, equivalentes a 55% do patrimônio. Monitorar saldo e nota de realização.', 6),
    (v_user, v_thesis, 'Disputas judiciais e reputação no agro', 'Jurídico', 'medio', 'baixo', 'Planos econômicos e ação coletiva sobre venda casada no crédito rural. Monitorar itens extraordinários.', 7);

  insert into public.price_history (user_id, asset_id, price_date, price, source)
  values (v_user, v_asset, '2026-11-17', 14.84, 'análise (Money Times / Investidor10)')
  on conflict (asset_id, price_date) do nothing;

  insert into public.activity_log (user_id, asset_id, thesis_id, action, summary)
  values (v_user, v_asset, v_thesis, 'thesis_concluded', 'Tese v1 de BBAS3 importada (carga inicial)');
end
$pim$;

-- SAPR11 — Companhia de Saneamento do Paraná — Sanepar · tese v1 (2026-11-12)
do $pim$
declare
  v_user   uuid := (select id from auth.users order by created_at limit 1);
  v_asset  uuid;
  v_thesis uuid;
begin
  if v_user is null then
    raise exception 'Nenhum usuário em auth.users. Crie sua conta pelo app antes de rodar este seed.';
  end if;

  insert into public.assets (user_id, ticker, name, related_tickers, asset_class, sector, category, market, currency, country, website, ri_site, description, phase, current_price, price_date, price_source, market_cap, price_updated_at)
  values (v_user, 'SAPR11', 'Companhia de Saneamento do Paraná — Sanepar', 'SAPR3 (ON), SAPR4 (PN); unit = 1 ON + 4 PN', 'acao', 'Utilidade pública — Água e saneamento', 'Empresa regulada, sociedade de economia mista, perfil de valor e dividendos', 'B3 — Nível 2', 'BRL', 'Brasil', 'https://www.sanepar.com.br', 'https://ri.sanepar.com.br', 'A Sanepar é a companhia de saneamento do Paraná, uma sociedade de economia mista controlada pelo governo estadual e listada na B3 desde 2002. Ela capta, trata e distribui água e coleta e trata esgoto em 345 municípios (344 no Paraná e um em Santa Catarina), atendendo 4,4 milhões de economias de água e 3,7 milhões de esgoto. Também opera aterros de resíduos sólidos em escala pequena.

A empresa ganha dinheiro cobrando tarifas de água e esgoto dos consumidores. As tarifas são definidas pela Agepar, a agência reguladora estadual, que calcula o valor necessário para cobrir custos considerados eficientes e remunerar os investimentos feitos na rede. Água responde por 59% da receita e esgoto por 38%. Curitiba sozinha gera 21,8% do faturamento.

É a terceira maior companhia de saneamento listada do país, atrás de Sabesp e Copasa, e a única das três que continua sob controle estatal. Atende 100% da população urbana de sua área com água tratada e 83,5% com coleta de esgoto, com 100% do esgoto coletado tratado. Os contratos com 343 municípios vencem em 2048. A unit SAPR11 reúne uma ação ordinária e quatro preferenciais e é o papel mais líquido da companhia.', 'f3', 32.3, '2026-11-12', 'análise (StatusInvest / Investidor10 / BTG)', 9900000000, now())
  on conflict (user_id, ticker) do update set name = excluded.name, related_tickers = excluded.related_tickers, asset_class = excluded.asset_class, sector = excluded.sector, category = excluded.category, market = excluded.market, currency = excluded.currency, country = excluded.country, website = excluded.website, ri_site = excluded.ri_site, description = excluded.description, phase = excluded.phase, current_price = excluded.current_price, price_date = excluded.price_date, price_source = excluded.price_source, market_cap = excluded.market_cap
  returning id into v_asset;

  if exists (select 1 from public.theses where asset_id = v_asset and version = 1) then
    raise notice 'SAPR11: tese v1 já existe; nada foi inserido.';
    return;
  end if;

  insert into public.theses (user_id, asset_id, version, status, analysis_date, horizon, philosophy, next_review, price_ref_date, last_balance, objective, data_sources, opportunity, why_appreciate, invalidation, price_at_analysis, fair_value_pess, fair_value_base, fair_value_opt, safety_margin, max_buy_price, max_buy_manual, methodology, assumptions, entry_condition, max_contributions, first_purchase_plan, additional_purchase_criteria, no_buy_conditions, reduce_conditions, full_sell_conditions, hold_after_target, classification, quality, price_attractiveness, overall_risk, confidence, justification, limitations, dossier_url)
  values (v_user, v_asset, 1, 'current',
    '2026-11-12',
    '3 a 5 anos',
    'Value',
    '2027-02-26',
    '2026-11-12',
    '30/09/2026 (3T26, divulgado em 12/11/2026)',
    'Valorização por convergência ao valor justo, com renda de dividendos em segundo plano.',
    'Release 3T26 e 4T25 (RI Sanepar); fato relevante de 11/12/2025; Agepar; InfoMoney/Reuters; Genial; BTG; XP. Cotação: StatusInvest, Investidor10 e BTG.',
    'Monopólio regulado de água e esgoto no Paraná, com contratos até 2048, negociando a 6,8 vezes o lucro recorrente e a 0,80 vez o patrimônio, perto da mínima de 52 semanas. Ainda não há oportunidade: o preço está acima do preço máximo de compra de R$ 27,00. A entrada só faz sentido abaixo desse nível, com a margem estabilizada e a nova regra de reajuste definida sem perda de tarifa real.',
    'Receita cresce cerca de 8% ao ano com reajustes, volume e expansão do esgoto. O plano de R$ 13 bilhões em 2026-2030 amplia a base de ativos remunerada na tarifa. Corte de custos pelo novo governo, queda da Selic e a revisão tarifária de 2029 podem destravar valor. O passivo do precatório já está integralmente no balanço.',
    'Margem EBITDA ajustada abaixo de 36% por dois trimestres seguidos; decisão da Agepar que reduza a tarifa real ou glose investimentos; intervenção do governo em tarifa ou dividendos; dívida líquida mais passivo regulatório acima de 3,0 vezes o EBITDA; lucro recorrente anualizado abaixo de R$ 1,2 bilhão.',
    32.3,
    24,
    36,
    48,
    25,
    27,
    false,
    'Dividendos descontados em dois estágios, conferido por múltiplo de lucro recorrente e EV/RAB.',
    'Lucro recorrente de R$ 1,45 bilhão; crescimento real de 3% ao ano até 2033 e 1,5% na perpetuidade; payout de 30% até 2033 e cerca de 80% depois; custo de capital próprio real de 10,5% (NTN-B assumida em 7,5% mais prêmio de 3%). Conferência: 7,5 vezes o lucro recorrente e 0,75 vez uma base de ativos estimada em R$ 24 bilhões. Pessimista: lucro de R$ 1,3 bilhão, crescimento de 1%, custo de capital de 12%. Otimista: lucro de R$ 1,6 bilhão, crescimento de 4,5%, custo de capital de 9,5%. Cada ponto percentual no custo de capital move o valor justo em cerca de R$ 5. Margem de 25%, acima dos 20% de referência, pelo risco regulatório e pela troca de governo.',
    'Cotação entre R$ 25,00 e R$ 27,00 sem piora dos fundamentos, com margem EBITDA ajustada acima de 37% e nenhum gatilho de invalidação rompido.',
    null,
    'Nenhuma. Aguardando preço; alerta em R$ 27,00.',
    'Reavaliar a tese a cada compra. Reforçar só abaixo de R$ 27,00 e com lucro recorrente anualizado acima de R$ 1,35 bilhão. Não fazer preço médio apenas porque caiu.',
    'Queda causada por decisão regulatória ou do governo que reduza a tarifa real; margem EBITDA ajustada abaixo de 36%; dividendo abaixo do mínimo estatutário; alavancagem econômica acima de 3,0 vezes.',
    'Cotação acima de R$ 36,00 sem melhora dos fundamentos; revisão do valor justo para baixo deixando a cotação acima dele; margem EBITDA ajustada abaixo de 37% por dois trimestres; alavancagem econômica acima de 2,8 vezes.',
    'Cotação acima de R$ 44,00 sem revisão do valor justo para cima, ou qualquer gatilho de invalidação rompido.',
    'Se o valor justo for revisto para cima por corte de custos comprovado em dois trimestres, queda relevante dos juros reais, ganho judicial sobre os 25% do precatório ou agenda concreta de privatização.',
    'observacao',
    'medio',
    'medio',
    'alto',
    'medio',
    'Não comprar agora. Empresa de qualidade média a preço razoável, mas o ganho até o valor justo base de R$ 36,00 não compensa a perda possível no cenário pessimista de R$ 24,00. A queda recente retirou do preço a expectativa de privatização e o dividendo do precatório, mas ainda não embute a piora de margem do 3T26. Aguardar a reação do mercado ao 3T26, o JCP de dezembro, a posse do novo governo, a regra do reajuste de 2027 e o resultado do 4T26. Alerta de preço em R$ 27,00.',
    'Valor justo sensível a juros e à regulação; base de ativos homologada e taxa da NTN-B não validadas; lucro recorrente calculado com ajustes próprios; nova regra de reajuste ainda em consulta pública.',
    'https://claude.ai/artifact/GxvYnp5M1bvKM3ztWohvdb'
  )
  returning id into v_thesis;

  insert into public.thesis_indicators (user_id, thesis_id, name, value, period, note, is_custom, sort) values
    (v_user, v_thesis, 'P/L', 6.8, 'LTM recorrente', 'sobre lucro recorrente estimado de R$ 1,45 bi; reportado 19,4', false, 0),
    (v_user, v_thesis, 'P/VP', 0.8, 'set/26', 'VPA de R$ 41,05 por unit', false, 1),
    (v_user, v_thesis, 'ROE', 11.7, 'LTM recorrente', 'estimado; reportado 4,1', false, 2),
    (v_user, v_thesis, 'ROIC', 5.2, '3T26 anualizado', 'abaixo do custo de capital', false, 3),
    (v_user, v_thesis, 'EV/EBITDA', 5.3, 'LTM', 'com passivo regulatório e EBITDA ajustado; reportado 4,3', false, 4),
    (v_user, v_thesis, 'Dívida líquida/EBITDA', 2.4, 'set/26', 'com passivo regulatório; reportada 0,8; covenant 3,0', false, 5),
    (v_user, v_thesis, 'Margem líquida', 18.9, 'LTM recorrente', 'reportada 6,7', false, 6),
    (v_user, v_thesis, 'CAGR da receita', 8.5, '2021-2025', 'reajustes, volume e expansão do esgoto', false, 7),
    (v_user, v_thesis, 'Dividend Yield', 4.5, 'normalizado', 'R$ 1,46 por unit com payout de 30%; data-com 12 meses R$ 0,55; pago em 12 meses R$ 1,96', false, 8),
    (v_user, v_thesis, 'Margem EBITDA ajustada', 41.4, 'LTM', '3T26 de 37,8; 44,9 em 2023', true, 9),
    (v_user, v_thesis, 'Lucro recorrente por unit', 4.86, 'LTM', 'R$ por unit; base do valuation', true, 10),
    (v_user, v_thesis, 'Payout', 29.6, 'exercício 2025', 'JCP do 1S26 cancelado', true, 11),
    (v_user, v_thesis, 'Valor patrimonial por unit', 41.05, 'set/26', 'R$ por unit', true, 12);

  insert into public.thesis_triggers (user_id, thesis_id, indicator, condition, limit_value, current_value, value_date, sort) values
    (v_user, v_thesis, 'Margem EBITDA ajustada', 'lt', 36, 37.8, '2026-09-30', 0),
    (v_user, v_thesis, 'Dívida líquida + passivo regulatório / EBITDA', 'gt', 3, 2.4, '2026-09-30', 1),
    (v_user, v_thesis, 'Lucro recorrente anualizado (R$ bilhões)', 'lt', 1.2, 1.45, '2026-09-30', 2);

  insert into public.thesis_events (user_id, thesis_id, event_date, description) values
    (v_user, v_thesis, '2027-01-06', 'posse do novo governador do Paraná; indicações para diretoria e conselho'),
    (v_user, v_thesis, '2027-02-26', 'divulgação do resultado do 4T26 (data estimada)'),
    (v_user, v_thesis, '2027-05-17', 'reajuste tarifário anual pela nova metodologia da Agepar (data estimada)');

  insert into public.thesis_risks (user_id, thesis_id, description, category, probability, impact, notes, sort) values
    (v_user, v_thesis, 'Novas decisões da Agepar contra o acionista', 'Regulatório', 'medio', 'alto', 'Consulta Pública 006/2026 muda a metodologia de reajuste a partir de 2027. Acompanhar o índice de maio de 2027 e as notas técnicas. Invalida a tese.', 0),
    (v_user, v_thesis, 'Interferência do novo governo estadual', 'Político', 'medio', 'alto', 'Governador eleito criticou reajustes e prometeu choque de gestão. Acompanhar indicações para diretoria e conselho a partir de janeiro de 2027. Invalida a tese.', 1),
    (v_user, v_thesis, 'Compressão estrutural de margem', 'Operacional', 'alto', 'alto', 'Custos sobem acima da receita há dois anos. Com margem de 37%, o lucro recorrente cai para perto de R$ 1,2 bilhão. Invalida a tese.', 2),
    (v_user, v_thesis, 'Dividendos abaixo do esperado', 'Dividendos', 'alto', 'medio', 'Mínimo obrigatório estimado para 2026 é de R$ 0,36 por unit. Acompanhar a deliberação de dezembro de 2026.', 3),
    (v_user, v_thesis, 'Juros altos por mais tempo', 'Macroeconômico', 'medio', 'medio', 'Selic em 13,75%. Cada ponto percentual na taxa de desconto retira cerca de R$ 5 do valor justo.', 4),
    (v_user, v_thesis, 'Execução e financiamento do plano de R$ 13 bilhões', 'Financeiro', 'medio', 'medio', 'Dívida econômica de 2,4 vezes o EBITDA; limite dos covenants é 3,0 vezes. R$ 1,97 bilhão em obras não será remunerado.', 5),
    (v_user, v_thesis, 'Custo de carregar o passivo regulatório do precatório', 'Regulatório', 'alto', 'baixo', 'R$ 95 milhões por trimestre, hoje compensados pela receita do caixa; deixa de compensar se a Selic cair.', 6),
    (v_user, v_thesis, 'Seca e clima', 'Operacional', 'baixo', 'medio', 'Reservatórios em 100% em 30/09/2026.', 7);

  insert into public.price_history (user_id, asset_id, price_date, price, source)
  values (v_user, v_asset, '2026-11-12', 32.3, 'análise (StatusInvest / Investidor10 / BTG)')
  on conflict (asset_id, price_date) do nothing;

  insert into public.activity_log (user_id, asset_id, thesis_id, action, summary)
  values (v_user, v_asset, v_thesis, 'thesis_concluded', 'Tese v1 de SAPR11 importada (carga inicial)');
end
$pim$;
