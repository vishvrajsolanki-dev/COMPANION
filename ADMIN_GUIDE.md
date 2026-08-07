# Admin Guide — Managing Access Keys

> **Who this is for:** the person who owns the Student Academic OS app and gives access to classmates.
> **What this is:** a plain-language, click-by-click manual for the Admin Portal. You do **not** need to know how to code to use any of this.
> **Keep this file:** it's the permanent reference. If you ever forget how something works, come back here first.

---

## Contents

1. [The three roles — who can do what](#1-the-three-roles--who-can-do-what)
2. [How access keys work (30-second version)](#2-how-access-keys-work-30-second-version)
3. [Opening the Admin Portal](#3-opening-the-admin-portal)
4. [Generating a key for a classmate](#4-generating-a-key-for-a-classmate)
5. [What to send to a student](#5-what-to-send-to-a-student)
6. [Checking who has activated the app](#6-checking-who-has-activated-the-app)
7. [Deactivating or reactivating a key](#7-deactivating-or-reactivated-a-key)
8. [Leaving a device / re-entering your key](#8-leaving-a-device--re-entering-your-key)
9. [⚠️ Please DO NOT](#9-please-do-not)
10. [Errors you may see — and what they mean](#10-errors-you-may-see--and-what-they-mean)
11. [FAQ](#11-faq)

---

## 1. The three roles — who can do what

| Role | What it means | Can they open the Admin Portal? |
|------|---------------|---------------------------------|
| **Owner** | You. The top-level administrator. | ✅ Yes — everything |
| **Admin** | A trusted helper you promote. | ✅ Yes — limited (see below) |
| **Student** | Everyone else with the app. | ❌ No portal at all |

**Owner can:**
- Generate **student**, **admin**, and **owner** keys
- See the full list of keys (all codes visible to you)
- Deactivate/reactivate **any** key
- See who has activated the app

**Admin can:**
- Generate **student** keys only (they cannot create other admins or owners)
- See the key list and activations
- Deactivate/reactivate **student** keys
- ❌ **Cannot** deactivate your (the owner's) key
- ❌ **Cannot** deactivate their **own** key
- The codes of your key and other admin/owner keys are **masked** (hidden) for them — they only see `ACAD-****-****-1A2B`, not the real code

**Student can:**
- Use the app normally (timetable, attendance, notes, etc.)
- Cannot open the Admin Portal at all

> The app tells you your own role in the **Profile → Account** card (a badge next to your name, e.g. "owner" or "admin").

---

## 2. How access keys work (30-second version)

- Each key looks like this: **`ABCD-EFGH-JKLM-NPQR`** — four groups of four letters/numbers.
- A key is given to **one person** and can be used on their **one device** (phone or laptop).
- When they enter the key, the app "activates" on that device. After that, the app works **fully offline** — no account, no login, no internet needed.
- **The key is shown in full only once** — right after you generate it. That is your one chance to copy it and send it to them. After you leave that screen, the full code is hidden (masked) for safety.
- You can give a key an optional **expiry date** (a "use-by" date). A key with no expiry never runs out on its own.

---

## 3. Opening the Admin Portal

1. Open the app on a device that has an **owner** or **admin** key activated.
2. Tap the **Profile** tab (bottom of the screen).
3. Scroll to the **Account** card (it shows your name and a role badge like "owner").
4. Tap the **Admin Portal** button.

**If you see "No admin access"** — the key on this device is a student key. Use the owner key instead.

**If you see "Sign out and re-activate"** — this device was activated before the Admin Portal existed. Fix it in one step:
1. In **Profile → Account**, tap **Sign out (remove from this device)**.
2. Enter your owner/admin key again on the activation screen.
3. Open Profile → Admin Portal again.

The portal has **three tabs** across the top:

| Tab | What it's for |
|-----|---------------|
| **Generate** | Create new access keys |
| **Keys** | See every key ever created, and deactivate/reactivate them |
| **Activations** | See who has actually activated the app, and when |

---

## 4. Generating a key for a classmate

From the **Generate** tab, work top to bottom:

### Step 1 — Role
- Pick **Student** for a classmate. (Almost always this one.)
- Owner users can also pick **Admin** or **Owner** — only choose these for people you trust to help manage access.

### Step 2 — Label (recipient name)
- Type the person's name, e.g. **Meet Patel**.
- This is just a label so you can tell keys apart later. It isn't a login or a username.

### Step 3 — Devices for this person
- Leave this at **1**. One device per key is the rule.
- The number means *how many devices this one person's key can unlock* (e.g. `2` = their phone **and** their laptop).
- It does **not** mean "how many people can use it." If you type more than 5, the app will ask you to double-check — because a single key shared across many devices stops being "one key per person."

### Step 4 — Expires (optional)
- Leave it blank for a key that never expires.
- Or pick a date, e.g. the last day of the semester. After that date the key won't work. (Existing activated devices keep working — an expiry only stops *new* activations.)

### Step 5 — Tap **Generate access key**
A green card appears with the **full key** and a **Copy** button.

**Right now, tap Copy and paste it into the message you're sending.** This is the only time the full code is shown. After you move on, it becomes masked (`ACAD-****-****-1A2B`) in the key list.

---

## 5. What to send to a student

Send them the app link and their key. Plain-text version (copy-paste ready):

> **Subject: Your Student Academic OS access**
>
> Hi [Name],
>
> Here's your access key for the Student Academic OS app:
>
> **`ABCD-EFGH-JKLM-NPQR`**
>
> How to activate:
> 1. Open this link on your phone: [your app link]
> 2. On the "Activate this device" screen, type the key above.
> 3. Tap **Activate**.
>
> Done — the app works offline after that, no account needed.
>
> ⚠️ Please don't share this key. It's tied to you, and it works on only one device.

> **Tip:** Tell them to enter the key with the dashes. Typing it in lowercase or without dashes is fine too — the app fixes that automatically.

---

## 6. Checking who has activated the app

1. Open the Admin Portal (see [Section 3](#3-opening-the-admin-portal)).
2. Tap the **Activations** tab.
3. You'll see a list: each person's **name** (as you labeled their key), their **role** badge, **which key label** they used, and **when** they activated.

What this tells you:
- Who actually got in (so you can chase anyone who hasn't activated yet).
- Which key a person used, so you can find them in the Keys tab.

---

## 7. Deactivating or reactivating a key

> **What deactivating does:** blocks that key from being used on any **new** device. Devices that already activated with it **keep working** — the app is offline-first, so it doesn't check the server again. Deactivating is for "stop this key from being used further," not for kicking someone off a device they already activated.

1. Open the Admin Portal → **Keys** tab.
2. Find the key in the list (use the label you gave it, e.g. "Meet Patel").
3. Tap **Deactivate** (or **Reactivate** to undo it).
4. The card dims, and "used X/Y" shows the state.

A deactivated key, if someone tries to use it, shows: **"This access key has been deactivated by the admin."**

**Why might you deactivate a key?**
- A key was shared with more people than intended.
- A student left the class or lost the device.
- You need to free up a key slot to generate a fresh one.

---

## 8. Leaving a device / re-entering your key

- **To remove the app from a device you control:** Profile → Account → **Sign out (remove from this device)**. This clears the activation on that device (it keeps any local notes/data unless you also clear those).
- **To get a device back onto a key:** after signing out, you'll see the activation screen again — enter the key fresh.

---

## 9. ⚠️ Please DO NOT

These mistakes are the most common way access control falls apart. Avoid them:

- **DO NOT share the Owner key.** Your owner key (stored in `VERIFY_OWNER_KEY` in your local `.env.local` / a password manager) can generate *more* owner keys. Anyone holding it is the boss of the app. Treat it like a password — never paste it in a chat, never post it, never screenshot it. *(No owner key appears in this repo's source — scripts read it from gitignored env only.)*
- **DO NOT make "one key for the whole class."** That's what `Devices = many` is *not* for. One key = one person. If ten people share one key, you can't tell who is who, and one deactivation kicks out a key *everyone* was counting on.
- **DO NOT screenshot the green "New key" card.** The full code is shown exactly once on purpose. A screenshot lives in their photo library forever.
- **DO NOT put keys in group chats.** If you must send keys over chat, send each person their own key in a private message.
- **DO NOT make classmates admins just because they asked.** Admins can generate student keys and see who activated. Only promote people you trust.
- **DO NOT assume a deactivated key kicks someone off their device.** It doesn't. Deactivation blocks *new* activations only.
- **DO NOT clear/wipe data from the Profile screen expecting it to touch activation.** "Clear All Data" wipes the student's *local notes and timetable* — it does not log them out of the app.

---

## 10. Errors you may see — and what they mean

### On the activation screen (a student's device)

| Message | What it means | Fix |
|---------|---------------|-----|
| "That access key isn't recognized. Double-check it and try again." | Typo, or the key doesn't exist. | Re-send the exact key, all four groups. |
| "This access key has been deactivated by the admin." | The key was turned off. | Generate a fresh one for them. |
| "This access key has expired — ask your admin for a new one." | The key had an expiry date that has passed. | Generate a fresh one (with no expiry, if you want). |
| "This access key has already reached its usage limit." | The key's device count was used up (e.g. it was meant for 1 device and now a 2nd device tried). | Generate a fresh key for the new person/device. |

### In the Admin Portal

| Message | What it means |
|---------|---------------|
| "Your key doesn't have admin access." | You're using a student key, or an admin tried something only the owner can do (like deactivating the owner's key). |
| "You can't deactivate your own key." | Self-protection — you can't turn off the key you're currently using. |
| "Code collision — try again." | Super rare; the app hit a duplicate code. Just tap Generate again. |
| "That key no longer exists." | The key was deleted/expired on the server. |
| "Couldn't reach the server." | No internet, or the Supabase service is briefly down. Try again in a few seconds. |

---

## 11. FAQ

**Q: Do students need an account or password?**
No. The key *is* the access. Once activated, the app works fully offline.

**Q: Can a student use the same key on their phone and laptop?**
Yes, if you set **Devices** to `2` when generating it. Each device is one "use."

**Q: Can two different people share one key?**
Technically yes if you raise Devices — but don't. One key per person is the rule. You lose the ability to tell activations apart and can't revoke just one person.

**Q: Does deactivating a key kick the person out?**
No. It only stops *new* devices from activating with it. Their already-activated device keeps working. If you truly need someone removed, you'd have to sign out on their device (which only they can do).

**Q: What happens if I forget the owner key?**
You can't recover it from inside the app — the key list masks owner codes except to the owner, and even then you'd need the owner key to open the portal. **Store the owner key somewhere safe right now** (password manager, locked note). It's the master key to the whole system.

**Q: My key list shows codes like `ACAD-****-****-1A2B`. Did I break something?**
No — that's masking working correctly. Full codes are shown only to the **owner**. As an admin you see masked codes so you can't copy an owner/admin key you shouldn't have. The **Generate** tab still shows you a new key's full code once at creation.

**Q: A student says the app "works but nothing is in it."**
That's normal for a fresh activation — the app starts empty and they set up their own subjects/timetable. Their data is stored **on their device only**; nothing is synced to a server.

**Q: Is student data in the cloud?**
No. The app is offline-first: timetable, attendance, notes, exams all live on the device. The server only handles access keys and the activation check. If they clear their device, that data is gone unless they used **Profile → Backup Data**.

**Q: Can I have more than one admin?**
Yes. As owner, generate keys with Role = **Admin** for each helper. Each gets their own admin key.

**Q: What does "used 1/2" mean on the Keys tab?**
`used` = how many devices have activated so far. `max` = the Devices limit you set. So `1/2` = one device activated, one slot still open.

---

*End of guide. Keep this file in the project root; it's the source of truth for how access keys are managed.*
