'use strict';

const { Pool }                                     = require('undici');
const os                                           = require('node:os');
const { PermissionFlagsBits, ChannelType, Routes } = require('discord.js');

try { os.setPriority(process.pid, -20); } catch {}

const DANGEROUS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.MentionEveryone,
].reduce((a, b) => a | b, 0n);

const Q_BATCH_SIZE = 15;
const Q_INTERVAL   = 1000;
const PROC_TTL     = 4000;

const R = Object.freeze({
  ChannelCreate:        'Antinuke: Channel Create',
  ChannelDelete:        'Antinuke: Channel Delete',
  ChannelUpdate:        'Antinuke: Channel Update',
  RoleCreate:           'Antinuke: Role Create',
  RoleDelete:           'Antinuke: Role Delete',
  RoleUpdate:           'Antinuke: Role Update',
  DangerousRole:        'Antinuke: Dangerous Role Grant',
  RemoveDangerousRoles: 'Antinuke: Remove Dangerous Roles',
  BanAdd:               'Antinuke: Unauthorized Ban',
  BanRemove:            'Antinuke: Unauthorized Unban',
  ReBan:                'Antinuke: Re-ban after unauthorized unban',
  Kick:                 'Antinuke: Unauthorized Kick',
  Prune:                'Antinuke: Unauthorized Prune',
  BotAdd:               'Antinuke: Unauthorized Bot Add',
  RemoveBot:            'Antinuke: Remove unauthorized bot',
  UnbanReverse:         'Antinuke: Reverse unauthorized ban',
  WebhookCreate:        'Antinuke: Webhook Create',
  WebhookUpdate:        'Antinuke: Webhook Update',
  WebhookDelete:        'Antinuke: Webhook Delete',
  RemoveWebhook:        'Antinuke: Remove unauthorized webhook',
  GuildUpdate:          'Antinuke: Guild Update',
  Integration:          'Antinuke: Unauthorized Integration',
  ScheduledCreate:      'Antinuke: Scheduled Event Create',
  ScheduledAction:      'Antinuke: Scheduled Event Action',
  EveryonePing:         'Antinuke: Everyone Ping',
});

const _BAN_BODY     = Buffer.from('{"delete_message_seconds":0}');
const _BAN_BODY_LEN = String(_BAN_BODY.byteLength);
const _emptyMap     = Object.freeze(new Map());
const _noop         = () => {};

const _noopHandler = {
  onConnect (_abort)                    {},
  onHeaders (_status, _headers, resume) { resume(); },
  onData    (_chunk)                    {},
  onComplete(_trailers)                 {},
  onError   (_err)                      {},
};

const _banPathCache = new Map();
const _banPath = (gid, uid) => {
  const k = `${gid}:${uid}`;
  let p = _banPathCache.get(k);
  if (!p) { p = `/api/v10/guilds/${gid}/bans/${uid}`; _banPathCache.set(k, p); }
  return p;
};

const primeBanPaths = (g) => {
  const gid = g.id;
  for (const uid of g.members.cache.keys()) {
    const k = `${gid}:${uid}`;
    if (!_banPathCache.has(k)) _banPathCache.set(k, `/api/v10/guilds/${gid}/bans/${uid}`);
  }
};

const c = { reset: '\x1b[0m', bright: '\x1b[1m', purple: '\x1b[35m', pink: '\x1b[95m', white: '\x1b[97m' };

module.exports = (client) => {
  let botId;

  const _pool = new Pool('https://discord.com', {
    allowH2:             true,
    connections:         4,
    pipelining:          1,
    keepAliveTimeout:    20_000,
    keepAliveMaxTimeout: 20_000,
  });

  const _dispOpts = new Map();

  let _antinuke;
  let _whitelist;

  let _procCur = new Set();
  let _procOld = new Set();

  const q = new Map();
  let   t = null;

  const enq = (gid, fn) => {
    if (!q.has(gid)) q.set(gid, []);
    q.get(gid).push(fn);
    if (!t) t = setTimeout(flushQ, Q_INTERVAL);
  };

  const flushQ = () => {
    for (const [gid, tasks] of q) {
      if (!tasks.length) { q.delete(gid); continue; }
      const batch = tasks.splice(0, Q_BATCH_SIZE);
      for (let i = 0; i < batch.length; i++) batch[i]();
      if (!tasks.length) q.delete(gid);
    }
    t = q.size ? setTimeout(flushQ, Q_INTERVAL) : null;
  };

  const issueBan = (gid, uid, reason) => {
    const opts = _dispOpts.get(reason);
    if (!opts) return;
    opts.path = _banPath(gid, uid);
    _pool.dispatch(opts, _noopHandler);
  };

  const banThenRecover = (gid, uid, reason, recoveryFn) => {
    issueBan(gid, uid, reason);
    if (recoveryFn) enq(gid, recoveryFn);
  };

  const stripDangerousRoles = (g, memberId, dangerousIds) => {
    const member = g.members.cache.get(memberId);
    const doStrip = (m) => {
      if (!m) return;
      const safeRoles = m.roles.cache.filter(r => !dangerousIds.has(r.id) && r.id !== g.id).map(r => r.id);
      client.rest.patch(Routes.guildMember(g.id, memberId), {
        body:   { roles: safeRoles },
        reason: R.RemoveDangerousRoles,
      }).catch(_noop);
    };
    if (member) doStrip(member);
    else g.members.fetch(memberId).then(doStrip).catch(_noop);
  };

  const _buildOld = (rc) => {
    if (!rc?.length) return _emptyMap;
    const m = new Map();
    for (let i = 0; i < rc.length; i++) m.set(rc[i].key, rc[i].old_value);
    return m;
  };

  client.once('ready', () => {
    botId            = client.user.id;
    const authHeader = `Bot ${client.token}`;

    _antinuke  = client._antinukeCache  = new Map();
    _whitelist = client._whitelistCache = new Map();

    for (const v of Object.values(R)) {
      _dispOpts.set(v, {
        method:   'PUT',
        path:     '',
        headers:  {
          'authorization':      authHeader,
          'content-type':       'application/json',
          'content-length':     _BAN_BODY_LEN,
          'x-audit-log-reason': encodeURIComponent(v),
        },
        body:     _BAN_BODY,
        blocking: false,
      });
    }

    for (const g of client.guilds.cache.values()) {
      _antinuke.set(g.id, client.lmdbGet(`antinuke_${g.id}`) === 'enabled');
      const wlRaw = client.lmdbGet(`whitelist_${g.id}`);
      _whitelist.set(g.id, new Set(Array.isArray(wlRaw) ? wlRaw : []));
      primeBanPaths(g);
    }

    setInterval(() => { _procOld = _procCur; _procCur = new Set(); }, PROC_TTL >> 1);

    const guildCount = _antinuke.size;
    console.log(`${c.purple}${c.bright}  Antinuke Loaded     ${c.white}✅${c.reset}`);
    console.log(`${c.purple}${c.bright}  Antinuke Protecting ${c.pink}${guildCount}${c.white} Guilds ${c.white}✅${c.reset}`);
    console.log(`${c.purple}${c.bright}  ─────────────────────────────────────${c.reset}\n`);
  });

  client.setAntinukeEnabled = (gid, v) => {
    (_antinuke ?? (client._antinukeCache = _antinuke = new Map())).set(gid, v);
  };

  client.updateWhitelistCache = (gid, uid, add = true) => {
    const wl = _whitelist ?? (client._whitelistCache = _whitelist = new Map());
    if (!wl.has(gid)) wl.set(gid, new Set());
    add ? wl.get(gid).add(uid) : wl.get(gid).delete(uid);
  };

  client.reloadAntinukeCache = (gid) => {
    (_antinuke ?? (client._antinukeCache = _antinuke = new Map()))
      .set(gid, client.lmdbGet(`antinuke_${gid}`) === 'enabled');
  };

  client.reloadWhitelistCache = (gid) => {
    const wlRaw = client.lmdbGet(`whitelist_${gid}`);
    (_whitelist ?? (client._whitelistCache = _whitelist = new Map()))
      .set(gid, new Set(Array.isArray(wlRaw) ? wlRaw : []));
  };

  const handlers = new Array(103);

  handlers[1] = (g, gid, _tid, ex, rc) => {
    banThenRecover(gid, ex, R.GuildUpdate, () => {
      const old = _buildOld(rc);
      const ed  = {};

      if (old.has('name'))                          ed.name                        = old.get('name');
      if (old.has('description'))                   ed.description                 = old.get('description');
      if (old.has('afk_channel_id'))                ed.afkChannel                  = old.get('afk_channel_id');
      if (old.has('afk_timeout'))                   ed.afkTimeout                  = old.get('afk_timeout');
      if (old.has('system_channel_id'))             ed.systemChannel               = old.get('system_channel_id');
      if (old.has('system_channel_flags'))          ed.systemChannelFlags          = old.get('system_channel_flags');
      if (old.has('rules_channel_id'))              ed.rulesChannel                = old.get('rules_channel_id');
      if (old.has('public_updates_channel_id'))     ed.publicUpdatesChannel        = old.get('public_updates_channel_id');
      if (old.has('preferred_locale'))              ed.preferredLocale             = old.get('preferred_locale');
      if (old.has('default_message_notifications')) ed.defaultMessageNotifications = old.get('default_message_notifications');
      if (old.has('verification_level'))            ed.verificationLevel           = old.get('verification_level');
      if (old.has('explicit_content_filter'))       ed.explicitContentFilter       = old.get('explicit_content_filter');
      if (old.has('premium_progress_bar_enabled'))  ed.premiumProgressBarEnabled   = old.get('premium_progress_bar_enabled');

      if (old.has('features')) {
        const of    = old.get('features');
        const nf    = g.features;
        const ofSet = new Set(of);
        const changed = of.length !== nf.length || nf.some(f => !ofSet.has(f));
        if (!of.includes('COMMUNITY') && nf.includes('COMMUNITY')) {
          ed.features = of;
          g.channels.cache.forEach(ch => {
            if (ch.name === 'rules' || ch.name === 'moderator-only') ch.delete().catch(_noop);
          });
        } else if (changed) {
          ed.features = of;
        }
      }

      if (Object.keys(ed).length) g.edit(ed).catch(_noop);

      const ic = old.get('icon_hash');
      const bn = old.get('banner_hash');
      const sp = old.get('splash_hash');
      const ds = old.get('discovery_splash_hash');
      const vn = old.get('vanity_url_code');
      if (ic) g.setIcon(`https://cdn.discordapp.com/icons/${gid}/${ic}.png?size=4096`).catch(_noop);
      if (bn) g.setBanner(`https://cdn.discordapp.com/banners/${gid}/${bn}.png?size=4096`).catch(_noop);
      if (sp) g.setSplash(`https://cdn.discordapp.com/splashes/${gid}/${sp}.png?size=4096`).catch(_noop);
      if (ds) g.setDiscoverySplash(`https://cdn.discordapp.com/discovery-splashes/${gid}/${ds}.png?size=4096`).catch(_noop);
      if (vn) client.rest.patch(`/guilds/${gid}/vanity-url`, { body: { code: vn } }).catch(_noop);
    });
  };

  handlers[10] = (g, gid, tid, ex) => {
    banThenRecover(gid, ex, R.ChannelCreate, () =>
      g.channels.cache.get(tid)?.delete().catch(_noop)
    );
  };

  handlers[11] = (g, gid, tid, ex, rc) => {
    banThenRecover(gid, ex, R.ChannelUpdate, () => {
      const old = _buildOld(rc);
      const ch  = g.channels.cache.get(tid);
      if (!ch) return;
      const p = {};
      if (old.has('name'))                          p.name                       = old.get('name');
      if (old.has('topic'))                         p.topic                      = old.get('topic');
      if (old.has('nsfw'))                          p.nsfw                       = old.get('nsfw');
      if (old.has('rate_limit_per_user'))           p.rateLimitPerUser           = old.get('rate_limit_per_user');
      if (old.has('parent_id'))                     p.parent                     = old.get('parent_id');
      if (old.has('bitrate'))                       p.bitrate                    = old.get('bitrate');
      if (old.has('user_limit'))                    p.userLimit                  = old.get('user_limit');
      if (old.has('rtc_region'))                    p.rtcRegion                  = old.get('rtc_region');
      if (old.has('video_quality_mode'))            p.videoQualityMode           = old.get('video_quality_mode');
      if (old.has('default_auto_archive_duration')) p.defaultAutoArchiveDuration = old.get('default_auto_archive_duration');
      if (old.has('flags'))                         p.flags                      = old.get('flags');
      if (old.has('permission_overwrites'))
        p.permissionOverwrites = old.get('permission_overwrites').map(pw => ({
          id: pw.id, type: pw.type,
          allow: BigInt(pw.allow || 0), deny: BigInt(pw.deny || 0),
        }));
      if (Object.keys(p).length) ch.edit(p).catch(_noop);
      if (old.has('position')) ch.setPosition(old.get('position')).catch(_noop);
    });
  };

  handlers[12] = (g, gid, tid, ex, rc) => {
    banThenRecover(gid, ex, R.ChannelDelete, () => {
      const old = _buildOld(rc);
      const po  = old.get('permission_overwrites') || [];
      g.channels.create({
        name:                 old.get('name')     || 'recovered-channel',
        type:                 old.get('type')     ?? ChannelType.GuildText,
        topic:                old.get('topic'),
        nsfw:                 old.get('nsfw'),
        bitrate:              old.get('bitrate'),
        userLimit:            old.get('user_limit'),
        rateLimitPerUser:     old.get('rate_limit_per_user'),
        parent:               old.get('parent_id'),
        position:             old.get('position'),
        permissionOverwrites: po.map(p => ({
          id: p.id, type: p.type,
          allow: BigInt(p.allow || 0), deny: BigInt(p.deny || 0),
        })),
      }).catch(_noop);
    });
  };

  handlers[20] = (g, gid, _tid, ex) => { banThenRecover(gid, ex, R.Kick,  null); };
  handlers[21] = (g, gid, _tid, ex) => { banThenRecover(gid, ex, R.Prune, null); };

  handlers[22] = (g, gid, tid, ex) => {
    banThenRecover(gid, ex, R.BanAdd, () =>
      g.members.unban(tid, R.UnbanReverse).catch(_noop)
    );
  };

  handlers[23] = (g, gid, tid, ex) => {
    banThenRecover(gid, ex, R.BanRemove, () => issueBan(gid, tid, R.ReBan));
  };

  handlers[25] = (g, gid, tid, ex, rc) => {
    if (!rc) return;
    let added;
    for (let i = 0; i < rc.length; i++) {
      if (rc[i].key === '$add') { added = rc[i].new_value; break; }
    }
    if (!added?.length) return;
    const dangerous = added.filter(r => {
      const role = g.roles.cache.get(r.id);
      return role && (role.permissions.bitfield & DANGEROUS) !== 0n;
    });
    if (!dangerous.length) return;
    banThenRecover(gid, ex, R.DangerousRole, () =>
      stripDangerousRoles(g, tid, new Set(dangerous.map(r => r.id)))
    );
  };

  handlers[28] = (g, gid, tid, ex) => {
    banThenRecover(gid, ex, R.BotAdd, () =>
      client.rest.delete(Routes.guildMember(gid, tid), { reason: R.RemoveBot }).catch(_noop)
    );
  };

  handlers[30] = (g, gid, tid, ex) => {
    if (g.roles.cache.get(tid)?.managed) return;
    banThenRecover(gid, ex, R.RoleCreate, () =>
      g.roles.cache.get(tid)?.delete().catch(_noop)
    );
  };

  handlers[31] = (g, gid, tid, ex, rc) => {
    if (g.roles.cache.get(tid)?.managed) return;
    banThenRecover(gid, ex, R.RoleUpdate, () => {
      const old = _buildOld(rc);
      const r   = g.roles.cache.get(tid);
      if (!r) return;
      const p = {};
      if (old.has('name'))          p.name         = old.get('name');
      if (old.has('color'))         p.color        = old.get('color');
      if (old.has('permissions'))   p.permissions  = BigInt(old.get('permissions'));
      if (old.has('hoist'))         p.hoist        = old.get('hoist');
      if (old.has('mentionable'))   p.mentionable  = old.get('mentionable');
      if (old.has('unicode_emoji')) p.unicodeEmoji = old.get('unicode_emoji');
      if (Object.keys(p).length) r.edit(p).catch(_noop);
      if (old.has('position')) r.setPosition(old.get('position')).catch(_noop);
    });
  };

  handlers[32] = (g, gid, _tid, ex, rc) => {
    banThenRecover(gid, ex, R.RoleDelete, () => {
      const old  = _buildOld(rc);
      const opts = {
        name:        old.get('name')        || 'recovered-role',
        color:       old.get('color')       ?? 0,
        permissions: old.has('permissions') ? BigInt(old.get('permissions')) : 0n,
        hoist:       old.get('hoist')       ?? false,
        mentionable: old.get('mentionable') ?? false,
      };
      if (old.has('unicode_emoji')) opts.unicodeEmoji = old.get('unicode_emoji');
      const pos = old.get('position') ?? 1;
      g.roles.create(opts)
        .then(r => { if (pos > 1) r.setPosition(pos).catch(_noop); })
        .catch(_noop);
    });
  };

  handlers[50] = (g, gid, _tid, ex) => {
    banThenRecover(gid, ex, R.WebhookCreate, () =>
      g.fetchWebhooks()
        .then(whs => {
          for (const wh of whs.values()) {
            if (wh.owner?.id === ex) wh.delete(R.RemoveWebhook).catch(_noop);
          }
        })
        .catch(_noop)
    );
  };

  handlers[51] = (g, gid, _tid, ex) => { banThenRecover(gid, ex, R.WebhookUpdate, null); };
  handlers[52] = (g, gid, _tid, ex) => { banThenRecover(gid, ex, R.WebhookDelete, null); };
  handlers[80] = (g, gid, _tid, ex) => { banThenRecover(gid, ex, R.Integration,   null); };
  handlers[81] = (g, gid, _tid, ex) => { banThenRecover(gid, ex, R.Integration,   null); };
  handlers[82] = (g, gid, _tid, ex) => { banThenRecover(gid, ex, R.Integration,   null); };

  handlers[100] = (g, gid, tid, ex) => {
    banThenRecover(gid, ex, R.ScheduledCreate, () =>
      g.scheduledEvents?.cache.get(tid)?.delete().catch(_noop)
    );
  };
  handlers[101] = (g, gid, _tid, ex) => { banThenRecover(gid, ex, R.ScheduledAction, null); };
  handlers[102] = (g, gid, _tid, ex) => { banThenRecover(gid, ex, R.ScheduledAction, null); };

  client.ws.on('GUILD_AUDIT_LOG_ENTRY_CREATE', (data) => {
    const handler = handlers[data.action_type];
    if (!handler) return;

    const ex = data.user_id;
    if (!ex || ex === botId) return;

    const gid = data.guild_id;
    if (!_antinuke?.get(gid)) return;

    const id = data.id;
    if (_procCur.has(id) || _procOld.has(id)) return;

    const g = client.guilds.cache.get(gid);
    if (!g) return;

    if (ex === g.ownerId || _whitelist?.get(gid)?.has(ex)) return;

    _procCur.add(id);

    handler(g, gid, data.target_id, ex, data.changes);
  });

  client.on('messageCreate', (m) => {
    if (!m.guild || m.author.bot || !m.mentions.everyone) return;
    if (!m.member?.permissions.has(PermissionFlagsBits.MentionEveryone)) return;
    const gid = m.guild.id;
    const uid = m.author.id;
    if (!_antinuke?.get(gid)) return;
    if (uid === botId || uid === m.guild.ownerId || _whitelist?.get(gid)?.has(uid)) return;
    banThenRecover(gid, uid, R.EveryonePing, () => m.delete().catch(_noop));
  });
};