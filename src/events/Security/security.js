'use strict';

const { PermissionFlagsBits, ChannelType, Routes } = require('discord.js');

try { require('node:os').setPriority(process.pid, -20); } catch {}

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

const c = Object.freeze({
  reset: '\x1b[0m', bright: '\x1b[1m',
  purple: '\x1b[35m', pink: '\x1b[95m', white: '\x1b[97m',
});

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

const RI = Object.freeze({
  GuildUpdate:          0,
  ChannelCreate:        1,
  ChannelDelete:        2,
  ChannelUpdate:        3,
  Kick:                 4,
  Prune:                5,
  BanAdd:               6,
  BanRemove:            7,
  ReBan:                8,
  DangerousRole:        9,
  RemoveDangerousRoles: 10,
  BotAdd:               11,
  RemoveBot:            12,
  RoleCreate:           13,
  RoleDelete:           14,
  RoleUpdate:           15,
  WebhookCreate:        16,
  WebhookUpdate:        17,
  WebhookDelete:        18,
  RemoveWebhook:        19,
  Integration:          20,
  ScheduledCreate:      21,
  ScheduledAction:      22,
  EveryonePing:         23,
  UnbanReverse:         24,
});
const RI_COUNT = Object.keys(RI).length;

const _BAN_BODY = Buffer.from('{"delete_message_seconds":0}');
const _emptyMap = Object.freeze(new Map());
const _noop     = () => {};

module.exports = (client) => {

  let botId;

  const _banOptArr = new Array(RI_COUNT);

  let _antinukeSet = new Set();
  let _guildsCache;
  let _whitelist   = new Map();

  let _procCur = new Set();
  let _procOld = new Set();

  const q  = new Map();
  let   qt = null;

  const enq = (gid, fn) => {
    let tasks = q.get(gid);
    if (!tasks) q.set(gid, tasks = []);
    tasks.push(fn);
    if (!qt) qt = setTimeout(flushQ, Q_INTERVAL);
  };

  const flushQ = () => {
    for (const [gid, tasks] of q) {
      if (!tasks.length) { q.delete(gid); continue; }
      const batch = tasks.splice(0, Q_BATCH_SIZE);
      for (let i = 0; i < batch.length; i++) batch[i]();
      if (!tasks.length) q.delete(gid);
    }
    qt = q.size ? setTimeout(flushQ, Q_INTERVAL) : null;
  };

  client.once('ready', () => {
    botId        = client.user.id;
    _guildsCache = client.guilds.cache;

    const riToR = Object.create(null);
    for (const [k, ri] of Object.entries(RI)) riToR[ri] = R[k];

    for (let ri = 0; ri < RI_COUNT; ri++) {
      _banOptArr[ri] = Object.freeze({
        body:            _BAN_BODY,
        passThroughBody: true,
        reason:          riToR[ri] || '',
      });
    }

    for (const g of client.guilds.cache.values()) {
      if (client.lmdbGet(`antinuke_${g.id}`) === 'enabled') _antinukeSet.add(g.id);
      const wlRaw = client.lmdbGet(`whitelist_${g.id}`);
      _whitelist.set(g.id, new Set(Array.isArray(wlRaw) ? wlRaw : []));
    }

    _buildActionGuard();

    setInterval(() => { _procOld = _procCur; _procCur = new Set(); }, PROC_TTL >> 1);

    console.log(`${c.purple}${c.bright}  Antinuke Loaded     ${c.white}✅${c.reset}`);
    console.log(`${c.purple}${c.bright}  Antinuke Protecting ${c.pink}${_antinukeSet.size}${c.white} Guilds ${c.white}✅${c.reset}`);
    console.log(`${c.purple}${c.bright}  ─────────────────────────────────────${c.reset}\n`);
  });

  client.setAntinukeEnabled = (gid, v) => {
    v ? _antinukeSet.add(gid) : _antinukeSet.delete(gid);
  };

  client.updateWhitelistCache = (gid, uid, add = true) => {
    if (!_whitelist.has(gid)) _whitelist.set(gid, new Set());
    add ? _whitelist.get(gid).add(uid) : _whitelist.get(gid).delete(uid);
  };

  client.reloadAntinukeCache = (gid) => {
    client.lmdbGet(`antinuke_${gid}`) === 'enabled'
      ? _antinukeSet.add(gid)
      : _antinukeSet.delete(gid);
  };

  client.reloadWhitelistCache = (gid) => {
    const wlRaw = client.lmdbGet(`whitelist_${gid}`);
    _whitelist.set(gid, new Set(Array.isArray(wlRaw) ? wlRaw : []));
  };

  const issueBan = (gid, uid, ri) => {
    client.rest.put(`/guilds/${gid}/bans/${uid}`, _banOptArr[ri]).catch(_noop);
  };

  const banThenRecover = (gid, uid, ri, recoveryFn) => {
    issueBan(gid, uid, ri);
    if (recoveryFn) enq(gid, recoveryFn);
  };

  const stripDangerousRoles = (g, memberId, dangerousIds) => {
    const doStrip = (m) => {
      if (!m) return;
      const safeRoles = m.roles.cache
        .filter(r => !dangerousIds.has(r.id) && r.id !== g.id)
        .map(r => r.id);
      client.rest.patch(Routes.guildMember(g.id, memberId), {
        body: { roles: safeRoles }, reason: R.RemoveDangerousRoles,
      }).catch(_noop);
    };
    const member = g.members.cache.get(memberId);
    if (member) doStrip(member);
    else g.members.fetch(memberId).then(doStrip).catch(_noop);
  };

  const _buildOld = (rc) => {
    if (!rc?.length) return _emptyMap;
    const m = new Map();
    for (let i = 0; i < rc.length; i++) m.set(rc[i].key, rc[i].old_value);
    return m;
  };

  const handlers = Object.create(null);

  handlers[1] = (g, gid, tid, ex, rc) => {
    banThenRecover(gid, ex, RI.GuildUpdate, () => {
      const old = _buildOld(rc);
      const ed = {};
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
        const of = old.get('features'), nf = g.features;
        const ofSet = new Set(of);
        if (!of.includes('COMMUNITY') && nf.includes('COMMUNITY')) {
          ed.features = of;
          g.channels.cache.forEach(ch => {
            if (ch.name === 'rules' || ch.name === 'moderator-only') ch.delete().catch(_noop);
          });
        } else if (nf.length !== of.length || nf.some(f => !ofSet.has(f))) {
          ed.features = of;
        }
      }
      if (Object.keys(ed).length) g.edit(ed).catch(_noop);
      const ic = old.get('icon_hash'), bn = old.get('banner_hash'),
            sp = old.get('splash_hash'), ds = old.get('discovery_splash_hash'),
            vn = old.get('vanity_url_code');
      if (ic) g.setIcon(`https://cdn.discordapp.com/icons/${gid}/${ic}.png?size=4096`).catch(_noop);
      if (bn) g.setBanner(`https://cdn.discordapp.com/banners/${gid}/${bn}.png?size=4096`).catch(_noop);
      if (sp) g.setSplash(`https://cdn.discordapp.com/splashes/${gid}/${sp}.png?size=4096`).catch(_noop);
      if (ds) g.setDiscoverySplash(`https://cdn.discordapp.com/discovery-splashes/${gid}/${ds}.png?size=4096`).catch(_noop);
      if (vn) client.rest.patch(`/guilds/${gid}/vanity-url`, { body: { code: vn } }).catch(_noop);
    });
  };

  handlers[10] = (g, gid, tid, ex, rc) => {
    banThenRecover(gid, ex, RI.ChannelCreate, () =>
      g.channels.cache.get(tid)?.delete().catch(_noop)
    );
  };

  handlers[11] = (g, gid, tid, ex, rc) => {
    banThenRecover(gid, ex, RI.ChannelUpdate, () => {
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
    banThenRecover(gid, ex, RI.ChannelDelete, () => {
      const old = _buildOld(rc);
      const po  = old.get('permission_overwrites') || [];
      g.channels.create({
        name:                 old.get('name')  || 'recovered-channel',
        type:                 old.get('type')  ?? ChannelType.GuildText,
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

  handlers[20] = (g, gid, tid, ex, rc) => { banThenRecover(gid, ex, RI.Kick,  null); };
  handlers[21] = (g, gid, tid, ex, rc) => { banThenRecover(gid, ex, RI.Prune, null); };

  handlers[22] = (g, gid, tid, ex, rc) => {
    banThenRecover(gid, ex, RI.BanAdd, () =>
      g.members.unban(tid, R.UnbanReverse).catch(_noop)
    );
  };

  handlers[23] = (g, gid, tid, ex, rc) => {
    banThenRecover(gid, ex, RI.BanRemove, () => issueBan(gid, tid, RI.ReBan));
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
    banThenRecover(gid, ex, RI.DangerousRole, () =>
      stripDangerousRoles(g, tid, new Set(dangerous.map(r => r.id)))
    );
  };

  handlers[28] = (g, gid, tid, ex, rc) => {
    banThenRecover(gid, ex, RI.BotAdd, () =>
      client.rest.delete(Routes.guildMember(gid, tid), { reason: R.RemoveBot }).catch(_noop)
    );
  };

  handlers[30] = (g, gid, tid, ex, rc) => {
    if (g.roles.cache.get(tid)?.managed) return;
    banThenRecover(gid, ex, RI.RoleCreate, () =>
      g.roles.cache.get(tid)?.delete().catch(_noop)
    );
  };

  handlers[31] = (g, gid, tid, ex, rc) => {
    if (g.roles.cache.get(tid)?.managed) return;
    banThenRecover(gid, ex, RI.RoleUpdate, () => {
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

  handlers[32] = (g, gid, tid, ex, rc) => {
    banThenRecover(gid, ex, RI.RoleDelete, () => {
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

  handlers[50] = (g, gid, tid, ex, rc) => {
    banThenRecover(gid, ex, RI.WebhookCreate, () =>
      g.fetchWebhooks()
        .then(whs => {
          for (const wh of whs.values()) {
            if (wh.owner?.id === ex) wh.delete(R.RemoveWebhook).catch(_noop);
          }
        })
        .catch(_noop)
    );
  };

  handlers[51] = (g, gid, tid, ex, rc) => { banThenRecover(gid, ex, RI.WebhookUpdate, null); };
  handlers[52] = (g, gid, tid, ex, rc) => { banThenRecover(gid, ex, RI.WebhookDelete, null); };

  handlers[80] = (g, gid, tid, ex, rc) => { banThenRecover(gid, ex, RI.Integration, null); };
  handlers[81] = (g, gid, tid, ex, rc) => { banThenRecover(gid, ex, RI.Integration, null); };
  handlers[82] = (g, gid, tid, ex, rc) => { banThenRecover(gid, ex, RI.Integration, null); };

  handlers[100] = (g, gid, tid, ex, rc) => {
    banThenRecover(gid, ex, RI.ScheduledCreate, () =>
      g.scheduledEvents?.cache.get(tid)?.delete().catch(_noop)
    );
  };

  handlers[101] = (g, gid, tid, ex, rc) => { banThenRecover(gid, ex, RI.ScheduledAction, null); };
  handlers[102] = (g, gid, tid, ex, rc) => { banThenRecover(gid, ex, RI.ScheduledAction, null); };

  const _actionGuard = new Uint8Array(103);
  const _buildActionGuard = () => {
    for (const k of Object.keys(handlers)) _actionGuard[+k] = 1;
  };

  client.ws.on('GUILD_AUDIT_LOG_ENTRY_CREATE', (data) => {
    if (!_actionGuard[data.action_type]) return;

    const ex = data.user_id;
    if (!ex || ex === botId) return;

    const gid = data.guild_id;
    if (!_antinukeSet.has(gid)) return;

    const id = data.id;
    if (_procCur.has(id) || _procOld.has(id)) return;

    const g = _guildsCache.get(gid);
    if (!g) return;

    const wl = _whitelist.get(gid);
    if (ex === g.ownerId || (wl && wl.has(ex))) return;

    _procCur.add(id);
    handlers[data.action_type](g, gid, data.target_id, ex, data.changes);
  });

  client.on('messageCreate', (m) => {
    if (!m.guild || m.author.bot || !m.mentions.everyone) return;
    if (!m.member?.permissions.has(PermissionFlagsBits.MentionEveryone)) return;
    const gid = m.guild.id;
    const uid = m.author.id;
    if (!_antinukeSet.has(gid)) return;
    if (uid === botId || uid === m.guild.ownerId) return;
    const wl = _whitelist.get(gid);
    if (wl && wl.has(uid)) return;
    banThenRecover(gid, uid, RI.EveryonePing, () => m.delete().catch(_noop));
  });
};