# 🔍 QA Checklist - Suppression de Conversations

## Pre-Launch Validation

### Code Quality (✅ Automated)

```
TypeScript Compilation
├─ ✅ constants/firebase.js - 0 erreurs
├─ ✅ app/(tabs)/Message.tsx - 0 erreurs
└─ ✅ app/(pro-tabs)/Message.tsx - 0 erreurs

Imports
├─ ✅ Alert imported correctly
├─ ✅ hideConversationForUser imported correctly
└─ ✅ All dependencies resolved

Function Definitions
├─ ✅ hideConversationForUser() defined
├─ ✅ unhideConversationForUser() defined
├─ ✅ handleDeleteConversation() defined
└─ ✅ All functions exported/imported

Performance
├─ ✅ No console.logs left (production-safe)
├─ ✅ No memory leaks (listeners properly cleaned)
├─ ✅ Efficient filtering (client-side)
└─ ✅ No unnecessary re-renders
```

---

### Manual Testing (Parent App)

#### Test 1: Basic Delete
```
Scenario: Parent deletes a conversation with co-parent
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Steps:
1. [ ] Open Messages tab
2. [ ] See conversation with co-parent
3. [ ] Click trash icon 🗑️
4. [ ] Confirm deletion
5. [ ] Conversation disappears
6. [ ] See success alert

Expected: ✅ All steps pass
Actual: ___________
Notes: ___________
```

#### Test 2: Professional Conversation Delete
```
Scenario: Parent deletes a conversation with professional
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Steps:
1. [ ] Messages tab
2. [ ] Conversation with professional visible
3. [ ] Click 🗑️ button
4. [ ] Confirm
5. [ ] Conversation disappears

Expected: ✅ Success
Actual: ___________
```

#### Test 3: Cancel Delete
```
Scenario: Parent cancels deletion
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Steps:
1. [ ] Click 🗑️
2. [ ] Alert appears
3. [ ] Click "Annuler"
4. [ ] Alert closes
5. [ ] Conversation still visible

Expected: ✅ Conversation remains
Actual: ___________
```

#### Test 4: Multiple Deletes
```
Scenario: Parent deletes 3 different conversations
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Steps:
1. [ ] Delete conversation 1 → Success
2. [ ] Delete conversation 2 → Success
3. [ ] Delete conversation 3 → Success

Expected: ✅ All 3 deleted successfully
Actual: ___________
```

---

### Manual Testing (Professional App)

#### Test 5: Professional Delete
```
Scenario: Professional deletes a conversation
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Steps:
1. [ ] Open "Tous mes Clients"
2. [ ] Click 🗑️ on a conversation
3. [ ] Confirm
4. [ ] Conversation disappears

Expected: ✅ Deleted from pro view
Actual: ___________
```

#### Test 6: Pro Sees Deleted Parent Conversation
```
Scenario: Parent deletes, professional still sees it
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Preconditions:
- [ ] Parent and Professional both have the conversation open

Steps:
1. [ ] Parent: Delete conversation
2. [ ] Parent: Conversation disappears
3. [ ] Professional: Conversation still visible
4. [ ] Professional: Can click and view conversation

Expected: ✅ Pro still sees it
Actual: ___________
```

---

### Firestore Verification

#### Test 7: Document Integrity
```
Scenario: Verify Firestore document after deletion
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Steps:
1. [ ] Delete a conversation
2. [ ] Open Firestore Console
3. [ ] Navigate to conversations collection
4. [ ] Find the deleted conversation document

Expected Results:
✅ Document exists (not deleted)
✅ participants field unchanged
✅ hiddenFor field contains user UID
✅ lastMessage unchanged
✅ All other fields unchanged

Firestore Data:
{
  conversationId: "___________",
  participants: [___________, ___________],
  hiddenFor: [___________],  // Should contain deleting user
  lastMessage: "___________",
  // ... other fields ...
}

Status: ___________
```

#### Test 8: Multiple Users Deleting
```
Scenario: Two users both delete the same conversation
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Steps:
1. [ ] User1: Delete conversation
   Firestore: hiddenFor = ["user1"]
2. [ ] User2: Delete conversation
   Firestore: hiddenFor = ["user1", "user2"]
3. [ ] Verify both users in hiddenFor array

Expected: ✅ Both UIDs in hiddenFor
Actual: ___________
```

---

### Network & Error Handling

#### Test 9: Offline Delete Attempt
```
Scenario: User tries to delete without internet
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Steps:
1. [ ] Turn OFF WiFi/Cellular
2. [ ] Click delete button
3. [ ] Try to confirm

Expected: 
✅ Error alert appears after 5-10 sec
✅ Message: "Impossible de supprimer"
✅ Conversation remains visible

Actual: ___________
```

#### Test 10: Network Recovery
```
Scenario: Delete fails, then succeeds after retry
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Steps:
1. [ ] Delete with WiFi OFF → Fails
2. [ ] Turn WiFi ON
3. [ ] Try delete again → Success

Expected: ✅ Second attempt succeeds
Actual: ___________
```

---

### Real-Time Features

#### Test 11: Real-Time Listener Update
```
Scenario: Two browsers, one deletes, other updates
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Setup:
- [ ] Open app on Browser 1 (Parent A)
- [ ] Open app on Browser 2 (Parent B)
- [ ] Both see same conversation

Steps:
1. [ ] Parent A: Delete conversation
2. [ ] Parent A: Conversation disappears immediately
3. [ ] Parent B: Wait 2-3 seconds
4. [ ] Parent B: Conversation still visible (unchanged)

Expected: ✅ Each sees independently
Actual: ___________
```

---

### UI/UX Testing

#### Test 12: Icon Visibility
```
Scenario: Verify trash icon is visible and intuitive
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Checklist:
[ ] 🗑️ Icon visible on all conversations
[ ] 🗑️ Icon positioned consistently (top right)
[ ] 🗑️ Icon color is red (#FF6B6B) - stands out
[ ] 🗑️ Icon doesn't obstruct important info
[ ] 🗑️ Icon easy to tap on mobile (not too small)
[ ] Hover effect visible (desktop) if applicable

Feedback: ___________
```

#### Test 13: Alert Message
```
Scenario: Verify alert is clear
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Checklist:
[ ] Alert title: "Supprimer la conversation" - clear
[ ] Alert message includes person's name - clear
[ ] Alert message says "action cannot be undone" - warning visible
[ ] Buttons clearly labeled: "Annuler" and "Supprimer"
[ ] "Supprimer" button is red/destructive style

Feedback: ___________
```

#### Test 14: Success Feedback
```
Scenario: User gets confirmation after delete
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Steps:
1. [ ] Delete conversation
2. [ ] Observe feedback

Expected Feedback:
✅ Success alert appears
✅ Message: "La conversation a été supprimée de votre vue"
✅ Conversation disappears from list
✅ No orphaned state

Actual: ___________
```

---

### Edge Cases

#### Test 15: Delete Last Conversation
```
Scenario: User deletes their only conversation
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Steps:
1. [ ] Have only 1 conversation
2. [ ] Delete it
3. [ ] Observe empty state

Expected:
✅ Conversation deleted
✅ "Aucune conversation" message appears
✅ No errors or crashes

Actual: ___________
```

#### Test 16: Delete During Message Typing
```
Scenario: User deletes while a message is being sent
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Steps:
1. [ ] User typing in conversation
2. [ ] While typing, hit delete button
3. [ ] Confirm deletion

Expected:
✅ Conversation closes/disappears
✅ Unsent message is not sent
✅ No state inconsistency

Actual: ___________
```

#### Test 17: App Restart After Delete
```
Scenario: Delete conversation, restart app
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Steps:
1. [ ] Delete conversation
2. [ ] Restart app
3. [ ] Go to Messages

Expected:
✅ Conversation still deleted
✅ Local state consistent with Firestore
✅ hiddenFor field persisted

Actual: ___________
```

---

### Performance Testing

#### Test 18: Delete Speed
```
Scenario: Measure time from click to UI update
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Expected Timeline:
0-500ms: Alert appears
500-1500ms: Firestore update + snapshot
1500-2000ms: UI re-render
Total: < 2 seconds

Measurement:
Start time: __:__
Alert shown: __:__ (delta: __ ms)
Conversation gone: __:__ (delta: __ ms)
Status: ___________
```

#### Test 19: Load Time with Many Conversations
```
Scenario: Delete conversation when list has 50+ convs
Status: [ ] NOT TESTED [ ] IN PROGRESS [✓] PASSED

Setup:
- [ ] Create/load 50+ conversations
- [ ] Open Messages tab

Steps:
1. [ ] Measure initial load time
2. [ ] Delete one conversation
3. [ ] Measure delete time

Expected:
✅ Delete < 2 seconds regardless of count
✅ No lag or stuttering

Measurements:
Load: __ seconds
Delete: __ seconds
Status: ___________
```

---

## Sign-Off

### QA Lead Sign-Off

```
QA Lead: ___________________
Date: ___________________
Status: [ ] APPROVED [ ] NEEDS FIXES [ ] BLOCKED

Issues Found: _________________
_____________________________
_____________________________

Approved for: [ ] Dev [ ] Staging [ ] Production
```

### Security Review Sign-Off

```
Security: ___________________
Date: ___________________
Status: [ ] APPROVED [ ] NEEDS REVIEW

Security Issues: ___________________
_____________________________

Approved: [ ] YES [ ] NO
```

### Performance Review Sign-Off

```
Performance: ___________________
Date: ___________________
Status: [ ] APPROVED [ ] OPTIMIZATIONS NEEDED

Performance Issues: ___________________
_____________________________

Approved: [ ] YES [ ] NO
```

---

## Final Checklist

- [ ] All 19 tests passed
- [ ] No critical issues found
- [ ] No security issues found
- [ ] No performance issues found
- [ ] Code quality approved
- [ ] Documentation approved
- [ ] Ready for deployment
- [ ] Rollback plan confirmed

---

## Deployment Approval

**Status:** [ ] READY [ ] NOT READY

**Approved By:**
- QA: ___________________
- Security: ___________________
- Tech Lead: ___________________
- Product: ___________________

**Date:** ___________________

**Comments:** _____________________________

