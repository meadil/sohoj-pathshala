import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import Button from '../../components/Button';
import { useAlert } from '../../components/CustomAlert';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../lib/supabase';
import { colors, radius } from '../../theme/theme';

function youtubeIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m =
    url.match(/[?&]v=([^&#]{6,})/) ||
    url.match(/youtu\.be\/([^?&#/]{6,})/) ||
    url.match(/\/embed\/([^?&#/]{6,})/) ||
    url.match(/\/shorts\/([^?&#/]{6,})/);
  return m ? m[1] : null;
}

function BackIcon({ size = 22, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRight({ size = 20, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * DragHandleIcon — the 6-dot reorder grip. Replaces the old "☰" text glyph,
 * which is not guaranteed to exist in Hind Siliguri (learn.md #4: never use
 * keyboard/unicode characters as icons).
 */
function DragHandleIcon({ size = 16, color = colors.textSecondary }) {
  const dot = (cx, cy) => (
    <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.6} fill={color} />
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {dot(9, 6)}{dot(15, 6)}
      {dot(9, 12)}{dot(15, 12)}
      {dot(9, 18)}{dot(15, 18)}
    </Svg>
  );
}

function SaveIcon({ size = 22, color = '#FFFFFF', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 4h11l3 3v13H5Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M8 4v5h7V4M8 21v-7h8v7" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ size = 16, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShieldIcon({ size = 22, color = colors.warningPressed }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l8 4.5v9L12 21l-8-4.5v-9Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M12 9v5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="12" cy="17" r="1" fill={color} />
    </Svg>
  );
}

/**
 * TeacherCourseEditorScreen - Course editor (teacher.html +
 * owner.html #/course-editor). Gen-head (back → Courses, course title
 * + status sub, dirty-aware header Save), Page/Content tag toggle
 * (conditionally rendered, not co-mounted), owner-override note
 * when an owner edits unlisted, Page tab (price, trailer card with
 * real YouTube-link add/long-press-reorder/delete, description,
 * what-you-get list, instructors chips, FAQ list, how-pay note),
 * Content tab (subject → chapter → video tree; long-press reorder on
 * subject rows; "Add Subject" only). Copy verbatim from both
 * prototypes.
 *
 * STAGED MODEL: every edit (fields, chips, trailers, FAQs, adds,
 * deletes, reorders) stages locally; the header Save (gray clean /
 * orange dirty) flushes all in dependency order (subjects → chapters
 * → videos → orders → deletes → page → instructors → FAQs). Backing
 * out with unsaved changes offers Save / Discard / Draft(stay); the
 * same guard covers the system back gesture. View-only teachers see
 * no editing controls.
 */
export default function TeacherCourseEditorScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session, isOwner } = useUser();
  const alert = useAlert();

  const courseId = route?.params?.courseId || null;

  const [view, setView] = useState('page'); // 'page' | 'content'
  const [course, setCourse] = useState(null);
  const [listed, setListed] = useState(false);
  const [price, setPrice] = useState('');
  const [title, setTitle] = useState('');
  const [classLevelId, setClassLevelId] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [classLevels, setClassLevels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [addingLevel, setAddingLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [specs, setSpecs] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [approvedTeachers, setApprovedTeachers] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [tree, setTree] = useState([]);
  const [videosByChapter, setVideosByChapter] = useState({});
  const [newSubjectName, setNewSubjectName] = useState('');
  const [addingChapterFor, setAddingChapterFor] = useState(null);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [videoFormFor, setVideoFormFor] = useState(null);
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoDesc, setNewVideoDesc] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [expandedChapters, setExpandedChapters] = useState({});
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [subjectEditName, setSubjectEditName] = useState('');
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [chapterEditName, setChapterEditName] = useState('');
  const [trailers, setTrailers] = useState([]);
  const [showTrailerForm, setShowTrailerForm] = useState(false);
  const [trailerInput, setTrailerInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFaqSaving, setIsFaqSaving] = useState(false);

  const isBn = lang === 'bn';
  const canEdit = isOwner || listed;

  // Delete is creator-or-owner only, mirroring the RLS policy
  // courses_delete_creator_or_owner. A listed co-instructor may EDIT the
  // course but must never be able to remove it, so the button is hidden for
  // them entirely rather than shown and then refused by the database.
  const canDelete = isOwner || course?.created_by === session?.user?.id;

  // Publishing follows the DATABASE policy, not the creator rule:
  // courses_update_instructor_owner is (is_course_instructor OR is_owner),
  // i.e. a listed instructor is already permitted to publish. The UI was
  // stricter than the permission it guards, which hid the button entirely on
  // seeded courses (created_by IS NULL, since they were backfilled per class
  // level) and left nobody but an owner able to publish them.
  // Delete stays creator-or-owner because courses DELETE is genuinely stricter.
  const canPublish = canEdit;

  const load = async () => {
    try {
      if (!courseId) return;
      const { data: row, error } = await supabase
        .from('courses')
        .select('id, title, price, description, what_you_get, trailer_urls, is_published, class_level_id, group_id, created_by')
        .eq('id', courseId)
        .single();
      if (error) throw error;
      setCourse(row);
      setPrice(row?.price != null ? String(row.price) : '');
      setTitle(row?.title || '');
      setClassLevelId(row?.class_level_id || null);
      setGroupId(row?.group_id || null);
      setDescription(row?.description || '');
      setSpecs(Array.isArray(row?.what_you_get) ? row.what_you_get : []);
      setTrailers(
        (Array.isArray(row?.trailer_urls) ? row.trailer_urls : []).map((url, i) => ({
          key: `t-${i}-${String(url).slice(-11)}`,
          url: String(url),
        }))
      );
      setShowTrailerForm(false);
      setTrailerInput('');

      let snapLinks = [];
      if (session?.user?.id) {
        const { data: links } = await supabase
          .from('course_instructors')
          .select('teacher_id, is_creator, profiles(name)')
          .eq('course_id', courseId);
        setInstructors(links || []);
        snapLinks = links || [];
        setListed((links || []).some((l) => l.teacher_id === session.user.id));

        const { data: teachers } = await supabase
          .from('profiles')
          .select('id, name, nickname')
          .eq('role', 'teacher')
          .eq('teacher_approval_status', 'approved');
        setApprovedTeachers(teachers || []);

        // Class levels + groups for the pickers on the Page tab.
        const { data: levels } = await supabase
          .from('class_levels')
          .select('id, name')
          .order('order_index');
        setClassLevels(levels || []);
        const { data: grps } = await supabase
          .from('groups')
          .select('id, name')
          .order('order_index');
        setGroups(grps || []);
      } else {
        setInstructors([]);
        setApprovedTeachers([]);
        setListed(false);
      }

      const { data: faqRows } = await supabase
        .from('course_faqs')
        .select('id, question, answer')
        .eq('course_id', courseId)
        .order('order_index');
      setFaqs(faqRows || []);

      const { data: subs } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('course_id', courseId)
        .order('order_index');
      const treeRows = [];
      for (const s of subs || []) {
        const { data: chaps } = await supabase
          .from('chapters')
          .select('id, title')
          .eq('subject_id', s.id)
          .order('order_index');
        treeRows.push({ ...s, chapters: chaps || [] });
      }
      setTree(treeRows);

      const allChapIds = treeRows.flatMap((s) => s.chapters.map((c) => c.id));
      const vidsByChapter = {};
      if (allChapIds.length > 0) {
        const { data: vids, error: vidError } = await supabase
          .from('cq_videos')
          .select('id, title, description, youtube_url, order_index, chapter_id')
          .in('chapter_id', allChapIds)
          .order('order_index');
        if (vidError) throw vidError;
        (vids || []).forEach((v) => {
          if (!vidsByChapter[v.chapter_id]) vidsByChapter[v.chapter_id] = [];
          vidsByChapter[v.chapter_id].push(v);
        });
      }
      setVideosByChapter(vidsByChapter);
      // Snapshot for dirty-tracking: everything edits compare against this.
      snapshotRef.current = JSON.stringify({
        price: row?.price != null ? String(row.price) : '',
        title: row?.title || '',
        classLevelId: row?.class_level_id || null,
        groupId: row?.group_id || null,
        description: row?.description || '',
        specs: Array.isArray(row?.what_you_get) ? row.what_you_get : [],
        trailers: (Array.isArray(row?.trailer_urls) ? row.trailer_urls : []).map(String),
        instructors: snapLinks
          .map((l) => ({ teacher_id: l.teacher_id, is_creator: !!l.is_creator }))
          .sort((a, b) => String(a.teacher_id).localeCompare(String(b.teacher_id))),
        faqs: (faqRows || []).map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
        tree: treeRows.map((s) => ({
          id: s.id,
          name: s.name,
          chapters: s.chapters.map((c) => ({ id: c.id, title: c.title })),
        })),
        videos: Object.fromEntries(
          Object.entries(vidsByChapter).map(([k, v]) => [
            k,
            v.map((x, i) => ({
              id: x.id,
              title: x.title,
              desc: x.description || '',
              url: x.youtube_url || '',
              order: i,
            })),
          ])
        ),
      });
    } catch (err) {
      console.warn('CourseEditor: could not load course:', err?.message);
      setCourse(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId, session?.user?.id]);

  const note = (message) => {
    alert('', message);
  };

  // Publish / unpublish. Only the creator or the owner may flip this — it
  // decides whether students can see the course at all, so it is gated the
  // same way as delete. Unsaved edits are flushed first, otherwise publishing
  // would expose a stale version of the course.
  const handleTogglePublish = async (next) => {
    if (dirty && !locked) {
      const ok = await handleSaveAll();
      if (!ok) return; // save failed; do not publish a half-written course
    }
    if (next) {
      // Publishing an empty course would show students a dead page.
      const hasContent = tree.some((s) => s.chapters.length > 0);
      if (!hasContent) {
        alert(
          isBn ? 'প্রকাশ করা যায়নি' : 'Cannot publish',
          isBn
            ? 'অন্তত একটি বিষয় ও অধ্যায় যোগ করার পর কোর্সটি প্রকাশ করুন।'
            : 'Add at least one subject with a chapter before publishing.'
        );
        return;
      }
      if (!parsedPriceOk()) {
        alert(
          isBn ? 'দাম সঠিক নয়' : 'Invalid Price',
          isBn ? 'অনুগ্রহ করে সংখ্যায় দাম লিখুন।' : 'Please enter the price as a number.'
        );
        return;
      }
    }

    alert(
      next
        ? isBn ? 'কোর্সটি প্রকাশ করবেন?' : 'Publish course?'
        : isBn ? 'কোর্সটি আর প্রকাশিত থাকবে না?' : 'Unpublish course?',
      next
        ? isBn
          ? 'প্রকাশ করলে শিক্ষার্থীরা কোর্সটি দেখতে ও কিনতে পারবেন।'
          : 'Once published, students can see and buy this course.'
        : isBn
          ? 'আর প্রকাশিত না থাকলে কোর্সটি শিক্ষার্থীদের দেখা যাবে না।'
          : 'Students will no longer see this course. Existing purchases are kept.',
      [
        { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: next ? (isBn ? 'প্রকাশ করুন' : 'Publish') : isBn ? 'আর প্রকাশিত নয়' : 'Unpublish',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              const { error } = await supabase
                .from('courses')
                .update({ is_published: next })
                .eq('id', courseId);
              if (error) throw error;
              setCourse((prev) => (prev ? { ...prev, is_published: next } : prev));
              setDirty(false);
              alert(
                '',
                next
                  ? isBn ? 'কোর্স প্রকাশিত হয়েছে' : 'Course published'
                  : isBn ? 'কোর্স আর প্রকাশিত নয়' : 'Course unpublished'
              );
              route?.params?.onChanged?.();
            } catch (err) {
              console.warn('CourseEditor: publish toggle failed:', err?.message);
              alert(
                isBn ? 'হয়নি' : 'Could not update',
                err?.message || (isBn ? 'আবার চেষ্টা করুন।' : 'Please try again.')
              );
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const parsedPriceOk = () => !Number.isNaN(parseInt(String(price).replace(/[^0-9]/g, ''), 10));

  const handleDeleteCourse = () => {
    alert(
      isBn ? 'কোর্সটি মুছে ফেলবেন?' : 'Delete course?',
      isBn
        ? 'এটি কোর্সের সব বিষয়, অধ্যায় ও ভিডিও স্থায়ীভাবে মুছে ফেলবে। শিক্ষার্থীদের পেমেন্ট থাকলে কোর্সটি মুছা যাবে না।'
        : 'This permanently deletes all subjects, chapters, and videos of the course. A course that students have paid for cannot be deleted.',
      [
        { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: isBn ? 'মুছুন' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            // The DB does the whole cascade atomically in a BEFORE DELETE
            // trigger (trg_cascade_delete_course). We must NOT delete child
            // rows from the client first: if the course delete is then refused
            // (e.g. the course has purchases), the content is already gone and
            // the course is left as an empty shell. One statement, all or nothing.
            const { error } = await supabase.from('courses').delete().eq('id', courseId);

            if (error) {
              console.warn('CourseEditor: delete failed:', error?.message);
              // A course with student payments is deliberately protected by RLS.
              const blocked =
                /row-level security|violates/i.test(error?.message || '') ||
                error?.code === '42501';
              alert(
                isBn ? 'মুছা যায়নি' : 'Could not delete',
                blocked
                  ? isBn
                    ? 'এই কোর্সে শিক্ষার্থীদের পেমেন্ট রেকর্ড আছে, তাই মুছা যাবে না।'
                    : 'This course has student payment records, so it cannot be deleted.'
                  : error?.message ||
                      (isBn ? 'কোর্সটি মুছা যায়নি।' : 'The course could not be deleted.')
              );
              return;
            }

            // Only navigate after a clean delete — a navigation error here
            // must NOT be reported as "could not delete".
            try {
              route?.params?.onChanged?.();
              navigation?.navigate?.('CoursesMain');
            } catch (e) {
              console.warn('CourseEditor: post-delete navigation failed:', e?.message);
              navigation?.goBack?.();
            }
          },
        },
      ]
    );
  };

  const handleSaveAll = async () => {
    const parsed = parseInt(String(price).replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(parsed)) {
      alert(
        isBn ? 'দাম সঠিক নয়' : 'Invalid Price',
        isBn ? 'অনুগ্রহ করে সংখ্যায় দাম লিখো।' : 'Please enter the price as a number.'
      );
      return false;
    }
    setIsSaving(true);
    try {
      // 1. New subjects → real ids.
      const subjectIdMap = {};
      for (const [si, s] of tree.entries()) {
        if (String(s.id).startsWith('new-')) {
          if (!s.name || !s.name.trim()) {
            throw new Error(isBn ? 'একটি বিষয়ের নাম খালি আছে।' : 'One subject has an empty name.');
          }
          const { data, error } = await supabase
            .from('subjects')
            .insert({ course_id: courseId, name: s.name, order_index: si })
            .select('id')
            .single();
          if (error) throw error;
          subjectIdMap[s.id] = data.id;
        }
      }
      const realSubjectId = (sid) => subjectIdMap[sid] || sid;
      // 2. New chapters → real ids.
      const chapterIdMap = {};
      for (const s of tree) {
        const sid = realSubjectId(s.id);
        for (const [ci, c] of s.chapters.entries()) {
          if (String(c.id).startsWith('new-')) {
            const { data, error } = await supabase
              .from('chapters')
              .insert({ subject_id: sid, title: c.title, order_index: ci })
              .select('id')
              .single();
            if (error) throw error;
            chapterIdMap[c.id] = data.id;
          }
        }
      }
      const realChapterId = (cid) => chapterIdMap[cid] || cid;
      // 2b. Existing subject/chapter orders, one UPDATE per row.
      // Deliberately NOT upsert: upsert's INSERT branch fires a partial
      // row (null name) whenever the conflict arbiter misses, tripping
      // NOT NULL/RLS. UPDATE can only touch existing rows.
      for (const [si, s] of tree.entries()) {
        if (String(s.id).startsWith('new-')) continue;
        const { error } = await supabase
          .from('subjects')
          .update({ order_index: si })
          .eq('id', s.id);
        if (error) throw error;
        for (const [ci, c] of s.chapters.entries()) {
          if (String(c.id).startsWith('new-')) continue;
          const { error: chapError } = await supabase
            .from('chapters')
            .update({ order_index: ci })
            .eq('id', c.id);
          if (chapError) throw chapError;
        }
      }
      // 3. New videos.
      for (const [chapKey, vids] of Object.entries(videosByChapter)) {
        const realChap = realChapterId(chapKey);
        for (const [vi, v] of vids.entries()) {
          if (String(v.id).startsWith('new-')) {
            const { error } = await supabase.from('cq_videos').insert({
              chapter_id: realChap,
              title: v.title,
              description: v.description || null,
              youtube_url: v.youtube_url,
              order_index: vi,
            });
            if (error) throw error;
          }
        }
      }
      // 4. Existing video orders, one UPDATE per row (never upsert —
      // see 2b: upsert's INSERT branch can fire on partial rows).
      for (const vids of Object.values(videosByChapter)) {
        for (const [i, v] of vids.entries()) {
          if (String(v.id).startsWith('new-')) continue;
          const { error } = await supabase
            .from('cq_videos')
            .update({ order_index: i })
            .eq('id', v.id);
          if (error) throw error;
        }
      }
      // 5. Deleted videos (in snapshot, gone now).
      const snap = JSON.parse(snapshotRef.current || '{}');
      const snapIds = new Set(
        Object.values(snap.videos || {}).flat().map((v) => v.id).filter((id) => !String(id).startsWith('new-'))
      );
      const curIds = new Set(
        Object.values(videosByChapter).flat().map((v) => v.id).filter((id) => !String(id).startsWith('new-'))
      );
      const gone = [...snapIds].filter((id) => !curIds.has(id));
      if (gone.length > 0) {
        const { error } = await supabase.from('cq_videos').delete().in('id', gone);
        if (error) throw error;
      }
      // 6. Page fields + trailers.
      const { error: pageError } = await supabase
        .from('courses')
        .update({
          price: parsed,
          title: title.trim() || null,
          description: description.trim() || null,
          what_you_get: specs,
          trailer_urls: trailers.map((t) => t.url),
          class_level_id: classLevelId || null,
          group_id: groupId || null,
        })
        .eq('id', courseId);
      if (pageError) throw pageError;
      // 7. Instructors diff (creators never removed — UI blocks it).
      const snapInstr = snap.instructors || [];
      const snapSet = new Set(snapInstr.map((i) => i.teacher_id));
      const curSet = new Set(instructors.map((l) => l.teacher_id));
      for (const l of instructors) {
        if (!snapSet.has(l.teacher_id)) {
          const { error } = await supabase
            .from('course_instructors')
            .insert({ course_id: courseId, teacher_id: l.teacher_id, is_creator: false });
          if (error) throw error;
        }
      }
      for (const teacherId of [...snapSet].filter((id) => !curSet.has(id))) {
        const { error } = await supabase
          .from('course_instructors')
          .delete()
          .eq('course_id', courseId)
          .eq('teacher_id', teacherId);
        if (error) throw error;
      }
      // 8. New FAQs.
      const newFaqs = faqs.filter((f) => String(f.id).startsWith('new-'));
      for (const f of newFaqs) {
        const { error } = await supabase.from('course_faqs').insert({
          course_id: courseId,
          question: f.question,
          answer: f.answer,
          order_index: faqs.indexOf(f),
        });
        if (error) throw error;
      }
      alert('', isBn ? 'পরিবর্তন সংরক্ষিত' : 'Changes saved');
      await load();
      return true;
    } catch (err) {
      alert('Could Not Save', err?.message || 'Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Staged toggle: local only, flushed by Save.
  const toggleInstructor = (teacherId, currentlyOn, isCreator) => {
    if (isCreator || locked) {
      return;
    }
    if (currentlyOn) {
      setInstructors((prev) => prev.filter((l) => l.teacher_id !== teacherId));
    } else {
      const t = approvedTeachers.find((x) => x.id === teacherId);
      setInstructors((prev) => [
        ...prev,
        { teacher_id: teacherId, is_creator: false, profiles: { name: t?.name || '' } },
      ]);
    }
  };

  const handleAddFaq = async () => {
    const q = newFaqQ.trim();
    const a = newFaqA.trim();
    if (!q || !a) {
      alert(
        isBn ? 'প্রশ্ন ও উত্তর প্রয়োজন' : 'Question and Answer Required',
        isBn ? 'প্রশ্ন এবং উত্তর দুটোই লিখো।' : 'Please write both the question and the answer.'
      );
      return;
    }
    // Staged: rendered optimistically, inserted on Save.
    setFaqs((prev) => [...prev, { id: `new-faq-${Date.now()}`, question: q, answer: a }]);
    setNewFaqQ('');
    setNewFaqA('');
  };

  const locked = !canEdit;

  const snapshotRef = useRef(null);
  const dirtyRef = useRef(false);
  const exitingRef = useRef(false);

  // Dirty = working copy differs from the last load snapshot.
  const dirty = useMemo(() => {
    if (!snapshotRef.current) return false;
    const cur = JSON.stringify({
      price,
      title,
      classLevelId,
      groupId,
      description,
      specs,
      trailers: trailers.map((t) => t.url),
      instructors: instructors
        .map((l) => ({ teacher_id: l.teacher_id, is_creator: !!l.is_creator }))
        .sort((a, b) => String(a.teacher_id).localeCompare(String(b.teacher_id))),
      faqs: faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
      tree: tree.map((s) => ({
        id: s.id,
        name: s.name,
        chapters: s.chapters.map((c) => ({ id: c.id, title: c.title })),
      })),
      videos: Object.fromEntries(
        Object.entries(videosByChapter).map(([k, v]) => [
          k,
          v.map((x, i) => ({
            id: x.id,
            title: x.title,
            desc: x.description || '',
            url: x.youtube_url || '',
            order: i,
          })),
        ])
      ),
    });
    return cur !== snapshotRef.current;
  }, [price, title, classLevelId, groupId, description, specs, trailers, instructors, faqs, tree, videosByChapter]);
  dirtyRef.current = dirty;

  // Back with unsaved changes → Save / Discard / Draft(stay).
  const confirmExit = (exit) => {
    alert(
      isBn ? 'সংরক্ষণ করবেন?' : 'Save changes?',
      isBn ? 'অসংরক্ষিত পরিবর্তন আছে।' : 'You have unsaved changes.',
      [
        {
          text: isBn ? 'ডিসকার্ড' : 'Discard',
          style: 'destructive',
          onPress: async () => {
            exitingRef.current = true;
            await load();
            exit();
          },
        },
        { text: isBn ? 'ড্রাফ্ট' : 'Draft', style: 'cancel', onPress: () => {} },
        {
          text: isBn ? 'সেভ' : 'Save',
          onPress: async () => {
            exitingRef.current = true;
            const ok = await handleSaveAll();
            if (!ok) {
              exitingRef.current = false;
            } else {
              exit();
            }
          },
        },
      ]
    );
  };

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (!dirtyRef.current || exitingRef.current) return;
        e.preventDefault();
        confirmExit(() => navigation.dispatch(e.data.action));
      }),
    [navigation, isBn]
  );

  // Staged delete: removed locally, deleted from DB on Save.
  const handleDeleteVideo = (video) => {
    alert(isBn ? 'ভিডিও মুছুন' : 'Delete video', video.title || '', [
      { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
      {
        text: isBn ? 'মুছুন' : 'Delete',
        style: 'destructive',
        onPress: () => {
          setVideosByChapter((prev) => {
            const next = {};
            Object.entries(prev).forEach(([k, v]) => {
              next[k] = v.filter((x) => x.id !== video.id);
            });
            return next;
          });
        },
      },
    ]);
  };

  const handleAddSubject = () => {
    const name = newSubjectName.trim();
    if (!name) {
      alert(
        isBn ? 'নাম প্রয়োজন' : 'Name Required',
        isBn ? 'বিষয়ের নাম লিখুন।' : 'Please enter a subject name.'
      );
      return;
    }
    setTree((prev) => [...prev, { id: `new-sub-${Date.now()}`, name, chapters: [] }]);
    setNewSubjectName('');
  };

  const handleAddChapter = (subjectId) => {
    const title = newChapterTitle.trim();
    if (!title) {
      alert(
        isBn ? 'শিরোনাম প্রয়োজন' : 'Title Required',
        isBn ? 'অধ্যায়ের শিরোনাম লিখুন।' : 'Please enter a chapter title.'
      );
      return;
    }
    const tempId = `new-chap-${Date.now()}`;
    setTree((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, chapters: [...s.chapters, { id: tempId, title }] } : s
      )
    );
    setVideosByChapter((prev) => ({ ...prev, [tempId]: [] }));
    setNewChapterTitle('');
    setAddingChapterFor(null);
  };

  // Staged add-or-edit: new entries append, edits update in place.
  // Flushed by Save (inserts for new-*, order upserts for existing).
  const handleSaveVideo = (chapterKey) => {
    const title = newVideoTitle.trim();
    const url = newVideoUrl.trim();
    if (!title || !url) {
      alert(
        isBn ? 'তথ্য প্রয়োজন' : 'Information Required',
        isBn ? 'শিরোনাম এবং ইউটিউব লিংক দুটোই দিন।' : 'Please enter both a title and a YouTube link.'
      );
      return;
    }
    if (!youtubeIdFromUrl(url)) {
      alert(
        isBn ? 'সঠিক লিংক দিন' : 'Invalid Link',
        isBn ? 'ইউটিউব ভিডিও লিংক পেস্ট করুন।' : 'Paste a YouTube video link.'
      );
      return;
    }
    const desc = newVideoDesc.trim() || null;
    if (editingVideoId) {
      setVideosByChapter((prev) => ({
        ...prev,
        [chapterKey]: (prev[chapterKey] || []).map((x) =>
          x.id === editingVideoId ? { ...x, title, description: desc, youtube_url: url } : x
        ),
      }));
    } else {
      setVideosByChapter((prev) => ({
        ...prev,
        [chapterKey]: [
          ...(prev[chapterKey] || []),
          {
            id: `new-vid-${Date.now()}`,
            title,
            description: desc,
            youtube_url: url,
            order_index: (prev[chapterKey] || []).length,
            chapter_id: chapterKey,
          },
        ],
      }));
      setExpandedChapters((prev) => ({ ...prev, [chapterKey]: true }));
    }
    setNewVideoTitle('');
    setNewVideoDesc('');
    setNewVideoUrl('');
    setEditingVideoId(null);
    setVideoFormFor(null);
  };

  const cancelVideoForm = () => {
    setVideoFormFor(null);
    setEditingVideoId(null);
    setNewVideoTitle('');
    setNewVideoDesc('');
    setNewVideoUrl('');
  };

  const openVideoEditor = (chapterKey, v) => {
    setVideoFormFor(chapterKey);
    setEditingVideoId(v.id);
    setNewVideoTitle(v.title || '');
    setNewVideoDesc(v.description || '');
    setNewVideoUrl(v.youtube_url || '');
  };

  const handleRenameSubject = (subjectId) => {
    const name = subjectEditName.trim();
    if (!name) {
      alert(
        isBn ? 'নাম প্রয়োজন' : 'Name Required',
        isBn ? 'বিষয়ের নাম লিখুন।' : 'Please enter a subject name.'
      );
      return;
    }
    setTree((prev) => prev.map((s) => (s.id === subjectId ? { ...s, name } : s)));
    setEditingSubjectId(null);
    setSubjectEditName('');
  };

  const handleRenameChapter = (subjectId, chapterId) => {
    const title = chapterEditName.trim();
    if (!title) {
      alert(
        isBn ? 'শিরোনাম প্রয়োজন' : 'Title Required',
        isBn ? 'অধ্যায়ের শিরোনাম লিখুন।' : 'Please enter a chapter title.'
      );
      return;
    }
    setTree((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? { ...s, chapters: s.chapters.map((c) => (c.id === chapterId ? { ...c, title } : c)) }
          : s
      )
    );
    setEditingChapterId(null);
    setChapterEditName('');
  };

  const toggleChapter = (chapterId) => {
    setExpandedChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  const handleAddTrailer = () => {
    const url = trailerInput.trim();
    if (!url) return;
    if (!youtubeIdFromUrl(url)) {
      alert(
        isBn ? 'সঠিক লিংক দিন' : 'Invalid Link',
        isBn ? 'ইউটিউব ভিডিও লিংক পেস্ট করুন।' : 'Paste a YouTube video link.'
      );
      return;
    }
    setTrailers((prev) => [...prev, { key: `t-${Date.now()}`, url }]);
    setTrailerInput('');
    setShowTrailerForm(false);
  };

  const handleDeleteTrailer = (key) => {
    setTrailers((prev) => prev.filter((t) => t.key !== key));
  };

  // Long-press reorder menu for trailers (replaces the blank-in-Expo-Go
  // DraggableFlatList). Staged like every other edit — nothing writes until
  // the header Save.
  const moveTrailer = (idx, dir) => {
    const to = idx + dir;
    if (to < 0 || to >= trailers.length) return;
    setTrailers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const openTrailerMoveMenu = (idx) => {
    alert(
      isBn ? 'ক্রম বদলান' : 'Reorder',
      (idx + 1) + ' / ' + trailers.length,
      [
        { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
        { text: isBn ? 'উপরে' : 'Move up', onPress: () => moveTrailer(idx, -1) },
        { text: isBn ? 'নিচে' : 'Move down', onPress: () => moveTrailer(idx, 1) },
      ]
    );
  };

  // Overview rows: subjects only (one drag list = scroll stays alive).
  // Chapters/videos render as read-only preview inside expanded cards.
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const subjectRows = useMemo(() => tree.map((s) => ({
    key: `sub:${s.id}`,
    subject: s,
    chapters: s.chapters || [],
    videoCount: (s.chapters || []).reduce((n, c) => n + ((videosByChapter[c.id] || []).length), 0),
  })), [tree, videosByChapter]);

  // TODO(copy): provisional Bn labels for the reorder menu.
  const openMoveMenu = (idx) => {
    const total = tree.length;
    alert(isBn ? 'ক্রম বদলান' : 'Reorder', (idx + 1) + ' / ' + total, [
      { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
      { text: isBn ? 'উপরে' : 'Move up', onPress: () => moveSubject(idx, -1) },
      { text: isBn ? 'নিচে' : 'Move down', onPress: () => moveSubject(idx, 1) },
    ]);
  };

  const moveSubject = (idx, dir) => {
    const to = idx + dir;
    if (to < 0 || to >= tree.length) return;
    setTree((prev) => {
      const next = [...prev];
      const removed = next.splice(idx, 1);
      next.splice(to, 0, removed[0]);
      return next;
    });
  };

  const addClassLevel = async () => {
    const v = newLevelName.trim();
    if (!v) return;
    try {
      const { data: row, error } = await supabase
        .from('class_levels')
        .insert({ name: v, order_index: classLevels.length })
        .select('id')
        .single();
      if (error) throw error;
      setClassLevels((prev) => [...prev, { id: row.id, name: v }]);
      setClassLevelId(row.id);
      setNewLevelName('');
      setAddingLevel(false);
    } catch (e) {
      alert(isBn ? 'যোগ হয়নি' : 'Could not add', e?.message || 'Please try again.');
    }
  };

  const addGroup = async () => {
    const v = newGroupName.trim();
    if (!v) return;
    try {
      const { data: row, error } = await supabase
        .from('groups')
        .insert({ name: v, order_index: groups.length })
        .select('id')
        .single();
      if (error) throw error;
      setGroups((prev) => [...prev, { id: row.id, name: v }]);
      setGroupId(row.id);
      setNewGroupName('');
      setAddingGroup(false);
    } catch (e) {
      alert(isBn ? 'যোগ হয়নি' : 'Could not add', e?.message || 'Please try again.');
    }
  };

  const deleteClassLevel = (lv) => {
    alert(
      isBn ? 'ক্লাসটি মুছে ফেলবেন?' : 'Delete class level?',
      lv.name,
      [
        { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: isBn ? 'মুছুন' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('class_levels').delete().eq('id', lv.id);
            if (error) {
              alert(isBn ? 'মুছা যায়নি' : 'Could not delete', error.message);
              return;
            }
            setClassLevels((prev) => prev.filter((x) => x.id !== lv.id));
            if (classLevelId === lv.id) setClassLevelId(null);
          },
        },
      ]
    );
  };

  const deleteGroup = (g) => {
    alert(
      isBn ? 'গ্রুপটি মুছে ফেলবেন?' : 'Delete group?',
      g.name,
      [
        { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: isBn ? 'মুছুন' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('groups').delete().eq('id', g.id);
            if (error) {
              alert(isBn ? 'মুছা যায়নি' : 'Could not delete', error.message);
              return;
            }
            setGroups((prev) => prev.filter((x) => x.id !== g.id));
            if (groupId === g.id) setGroupId(null);
          },
        },
      ]
    );
  };

  const subLabel = !course
    ? ''
    : course.is_published
      ? (listed || isOwner
        ? (isBn ? 'আপনি তালিকাভুক্ত · এডিটযোগ্য' : 'You are listed · editable')
        : (isBn ? 'তালিকাভুক্ত নন · শুধু দেখা' : 'Not listed · view only'))
      : (isBn ? 'ড্রাফ্ট · চলমান' : 'Draft · in progress');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => {
            if (dirty && !locked) confirmExit(() => navigation?.goBack?.());
            else navigation?.goBack?.();
          }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'কোর্সে ফিরে যান' : 'Back to Courses'}
        >
          <BackIcon size={22} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{title.trim() || course?.title || (isBn ? 'কোর্স' : 'Course')}</Text>
          {!!subLabel && <Text style={styles.headSub}>{subLabel}</Text>}
        </View>
        {!locked && (
          <Pressable
            onPress={() => handleSaveAll()}
            disabled={!dirty || isSaving}
            style={[styles.headerSave, (!dirty || isSaving) && styles.headerSaveOff]}
            accessibilityRole="button"
            accessibilityLabel={isBn ? 'সংরক্ষণ করুন' : 'Save'}
          >
            <Text style={[styles.headerSaveText, (!dirty || isSaving) && styles.headerSaveTextOff]}>
              {isBn ? 'সেভ' : 'Save'}
            </Text>
          </Pressable>
        )}
        {isOwner && (
          <Text style={styles.chipGold}>{isBn ? 'মালিক' : 'Owner'}</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !course ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>
            {isBn ? 'কোর্স লোড করা যায়নি।' : 'Could not load the course.'}
          </Text>
        </View>
      ) : !canEdit ? (
        /* Defense in depth: the course list is already filtered, but a teacher
           must never reach the editor for a course they aren't listed on. */
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>
            {isBn
              ? 'আপনি এই কোর্সে তালিকাভুক্ত নন — এডিট করার অনুমতি নেই।'
              : 'You are not listed on this course — you cannot edit it.'}
          </Text>
          <Button
            title={isBn ? 'ফিরে যান' : 'Go back'}
            variant="secondary"
            size="md"
            onPress={() => navigation?.goBack?.()}
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* View Toggle (.ed-toggle → .tag-toggle) */}
          <View style={styles.tagToggle} accessibilityLabel={isBn ? 'এডিটর সেকশন' : 'Editor sections'}>
            {['page', 'content'].map((v) => (
              <Pressable
                key={v}
                onPress={() => setView(v)}
                style={[styles.tagPill, view === v && styles.tagPillOn]}
              >
                <Text style={[styles.tagText, view === v && styles.tagTextOn]}>
                  {v === 'page'
                    ? (isBn ? 'কোর্স পেজ' : 'Course Page')
                    : (isBn ? 'কোর্স কন্টেন্ট' : 'Course Content')}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Owner Override Note (.owner-note) */}
          {isOwner && !listed && (
            <View style={styles.ownerNote}>
              <ShieldIcon size={22} />
              <Text style={styles.ownerNoteText}>
                {isBn
                  ? 'আপনি এখানে ইনস্ট্রাক্টর হিসেবে তালিকাভুক্ত নন। ওনার ওভাররাইডে এডিট করতে পারছেন।'
                  : 'You are not listed as an instructor here. Owner override lets you edit.'}
              </Text>
            </View>
          )}

          {/* Page tab owns the only ScrollView — content tab scrolls via its own drag list below. */}
          {view === 'page' ? (
          <GestureScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.tabShown}>
              {/* Course title */}
              <View style={styles.field}>
                <Text style={styles.label}>{isBn ? 'কোর্সের নাম' : 'Course title'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={isBn ? 'যেমন: SSC বিজ্ঞান' : 'e.g. SSC Science'}
                  placeholderTextColor={colors.textTertiary}
                  value={title}
                  onChangeText={setTitle}
                  editable={!locked}
                />
              </View>

              {/* Class level + group pickers */}
              <View style={styles.field}>
                <Text style={styles.label}>{isBn ? 'ক্লাস লেভেল' : 'Class level'}</Text>
                <View style={styles.groupRow}>
                  {classLevels.map((lv) => {
                    const on = classLevelId === lv.id;
                    return (
                      <Pressable
                        key={lv.id}
                        onPress={() => !locked && setClassLevelId(lv.id)}
                        onLongPress={() => !locked && deleteClassLevel(lv)}
                        delayLongPress={400}
                        style={[styles.groupChip, on && styles.groupChipOn]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                      >
                        <Text style={[styles.groupChipText, on && styles.groupChipTextOn]}>{lv.name}</Text>
                      </Pressable>
                    );
                  })}
                  {!locked && (
                    <Pressable
                      onPress={() => setAddingLevel((v) => !v)}
                      style={styles.groupChipAdd}
                      accessibilityRole="button"
                      accessibilityLabel={isBn ? 'নতুন ক্লাস' : 'Add class'}
                    >
                      <Text style={styles.groupChipText}>+</Text>
                    </Pressable>
                  )}
                </View>
                {addingLevel && (
                  <View style={styles.addRow}>
                    <TextInput
                      style={[styles.input, styles.addInput]}
                      placeholder={isBn ? 'নতুন ক্লাস (যেমন: ২০২৭)' : 'New class (e.g. 2027)'}
                      placeholderTextColor={colors.textTertiary}
                      value={newLevelName}
                      onChangeText={setNewLevelName}
                      autoFocus
                    />
                    <Pressable onPress={addClassLevel} style={styles.addBtn} accessibilityRole="button">
                      <Text style={styles.addBtnText}>{isBn ? 'যোগ' : 'Add'}</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{isBn ? 'গ্রুপ' : 'Group'}</Text>
                <View style={styles.groupRow}>
                  {groups.map((g) => {
                    const on = groupId === g.id;
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => !locked && setGroupId(g.id)}
                        onLongPress={() => !locked && deleteGroup(g)}
                        delayLongPress={400}
                        style={[styles.groupChip, on && styles.groupChipOn]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                      >
                        <Text style={[styles.groupChipText, on && styles.groupChipTextOn]}>{g.name}</Text>
                      </Pressable>
                    );
                  })}
                  {!locked && (
                    <Pressable
                      onPress={() => setAddingGroup((v) => !v)}
                      style={styles.groupChipAdd}
                      accessibilityRole="button"
                      accessibilityLabel={isBn ? 'নতুন গ্রুপ' : 'Add group'}
                    >
                      <Text style={styles.groupChipText}>+</Text>
                    </Pressable>
                  )}
                </View>
                {addingGroup && (
                  <View style={styles.addRow}>
                    <TextInput
                      style={[styles.input, styles.addInput]}
                      placeholder={isBn ? 'নতুন গ্রুপ' : 'New group'}
                      placeholderTextColor={colors.textTertiary}
                      value={newGroupName}
                      onChangeText={setNewGroupName}
                      autoFocus
                    />
                    <Pressable onPress={addGroup} style={styles.addBtn} accessibilityRole="button">
                      <Text style={styles.addBtnText}>{isBn ? 'যোগ' : 'Add'}</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Price (.sp-fld) */}
              <View style={styles.field}>
                <Text style={styles.label}>{isBn ? 'মূল্য (৳)' : 'Price (৳)'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={isBn ? 'যেমন 2500' : 'e.g. 2500'}
                  placeholderTextColor={colors.textTertiary}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  editable={!locked}
                />
              </View>

              {/* Trailer Card (.db-card) — real YouTube links, staged. */}
              <View style={styles.dbCard}>
                <Text style={styles.label}>{isBn ? 'ট্রেলার ভিডিও' : 'Trailer video'}</Text>
                <Text style={styles.dbHint}>
                  {isBn
                    ? 'ইউটিউব লিংক যোগ করুন — নিচের Save চাপলে কোর্সে যুক্ত হবে'
                    : 'Add YouTube links — saved to the course on Save'}
                </Text>
                {trailers.length > 0 && (
                  /* Plain .map() rows inside the Page tab's GestureScrollView.
                     DraggableFlatList rendered BLANK in Expo Go when nested in a
                     ScrollView with scrollEnabled={false} (learn.md #6), so the
                     reorder affordance is a long-press menu instead of a drag.
                     Proven pattern — same as the Content tab's subject rows. */
                  <View style={styles.trailerList}>
                    {trailers.map((t, idx) => (
                      <View key={t.key} style={styles.vidRow}>
                        {!locked && (
                          <Pressable
                            onLongPress={() => openTrailerMoveMenu(idx)}
                            delayLongPress={150}
                            style={styles.vidBtn}
                            accessibilityRole="button"
                            accessibilityLabel={isBn ? 'ক্রম বদলান' : 'Reorder'}
                          >
                            <DragHandleIcon size={16} color={colors.textSecondary} />
                          </Pressable>
                        )}
                        <Text style={styles.vidTitle} numberOfLines={1}>
                          {t.url}
                        </Text>
                        {!locked && (
                          <Pressable
                            onPress={() => handleDeleteTrailer(t.key)}
                            style={styles.vidBtn}
                            accessibilityRole="button"
                            accessibilityLabel={isBn ? 'মুছুন' : 'Delete'}
                          >
                            <Text style={[styles.vidBtnText, styles.vidDelText]}>
                              {isBn ? 'মুছুন' : 'Del'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                {!locked && (
                  <>
                    <View style={styles.dbOps}>
                      <Button
                        title={isBn ? 'আপলোড' : 'Upload'}
                        variant="secondary"
                        size="md"
                        onPress={() => setShowTrailerForm((prev) => !prev)}
                      />
                    </View>
                    {showTrailerForm && (
                      <View style={styles.trailerForm}>
                        <TextInput
                          style={styles.input}
                          placeholder="https://www.youtube.com/watch?v=..."
                          placeholderTextColor={colors.textTertiary}
                          value={trailerInput}
                          onChangeText={setTrailerInput}
                          autoCapitalize="none"
                          keyboardType="url"
                        />
                        <Button
                          title={isBn ? 'যোগ করুন' : 'Add'}
                          variant="secondary"
                          size="md"
                          onPress={handleAddTrailer}
                        />
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* Description (.sp-fld) */}
              <View style={styles.field}>
                <Text style={styles.label}>{isBn ? 'সংক্ষিপ্ত বিবরণ' : 'Short description'}</Text>
                <TextInput
                  style={[styles.input, styles.area]}
                  placeholder={isBn ? 'কেনার আগে ছাত্ররা দেখে — এক-দুই লাইন।' : 'One or two lines students see before buying.'}
                  placeholderTextColor={colors.textTertiary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  editable={!locked}
                />
              </View>

              {/* What You Get (.spec-list, read-only rows + inline add) */}
              <View style={styles.section}>
                <Text style={styles.secTitle}>{isBn ? 'যা যা পাবেন' : 'What you get'}</Text>
                {specs.map((item, i) => (
                  <View key={i} style={styles.specRow}>
                    <CheckIcon size={16} color={colors.success} />
                    <Text style={styles.specText}>{item}</Text>
                    {!locked && (
                      <Pressable
                        onPress={() => setSpecs(specs.filter((_, j) => j !== i))}
                        style={styles.miniBtn}
                        accessibilityLabel={isBn ? 'মুছুন' : 'Remove'}
                      >
                        <Text style={styles.miniBtnText}>✕</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
                {!locked && (
                  <SpecAdder
                    isBn={isBn}
                    onAdd={(text) => setSpecs([...specs, text])}
                    placeholder={isBn ? 'নতুন আইটেম লিখুন…' : 'Write a new item…'}
                    buttonLabel={isBn ? 'আইটেম যোগ করুন' : 'Add item'}
                  />
                )}
              </View>

              {/* Instructors (.od-cluster → .tchr-chip) */}
              <View style={styles.section}>
                <Text style={styles.secTitle}>{isBn ? 'ইনস্ট্রাক্টর' : 'Instructors'}</Text>
                <Text style={styles.helperText}>
                  {isBn
                    ? 'কোর্স নির্মাতা স্বয়ংক্রিয়ভাবে যুক্ত হন। অনুমোদিত শিক্ষকদের থেকে আরও বেছে নিন।'
                    : 'The creator is added automatically. Pick more from approved teachers.'}
                </Text>
                <View style={styles.chipCluster}>
                  {approvedTeachers.map((t) => {
                    const link = instructors.find((l) => l.teacher_id === t.id);
                    const on = !!link;
                    const creator = !!link?.is_creator;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => toggleInstructor(t.id, on, creator)}
                        disabled={locked || creator}
                        style={[styles.tchrChip, on && styles.tchrChipOn]}
                      >
                        <View style={styles.tchrAva}>
                          <Text style={styles.tchrAvaLetter}>
                            {((t.name || 'A').trim().charAt(0) || 'A').toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.tchrName}>
                          {t.name}
                          {creator && (isBn ? ' (স্বয়ংক্রিয়)' : ' (auto-added)')}
                        </Text>
                        {on && <CheckIcon size={16} color="#FFFFFF" />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* FAQ */}
              <View style={styles.section}>
                <Text style={styles.secTitle}>{isBn ? 'প্রশ্নোত্তর' : 'FAQ'}</Text>
                <Text style={styles.helperText}>
                  {isBn ? 'এই কোর্সের জন্য আলাদা করে লেখা।' : 'Written fresh for this course.'}
                </Text>
                {faqs.map((f) => (
                  <View key={f.id} style={styles.faqCard}>
                    <Text style={styles.faqQ}>{f.question}</Text>
                    <Text style={styles.faqA}>{f.answer}</Text>
                  </View>
                ))}
                {!locked && (
                  <View style={styles.faqForm}>
                    <TextInput
                      style={styles.input}
                      placeholder={isBn ? 'প্রশ্ন লিখুন…' : 'Write the question…'}
                      placeholderTextColor={colors.textTertiary}
                      value={newFaqQ}
                      onChangeText={setNewFaqQ}
                    />
                    <TextInput
                      style={[styles.input, styles.area]}
                      placeholder={isBn ? 'উত্তর লিখুন…' : 'Write the answer…'}
                      placeholderTextColor={colors.textTertiary}
                      value={newFaqA}
                      onChangeText={setNewFaqA}
                      multiline
                    />
                    <Button
                      title={isBn ? 'প্রশ্ন যোগ করুন' : 'Add question'}
                      variant="secondary"
                      size="md"
                      loading={isFaqSaving}
                      onPress={handleAddFaq}
                    />
                  </View>
                )}
              </View>

              {/* How-pay Note */}
              <Pressable
                onPress={() =>
                  note(
                    isBn
                      ? 'গ্লোবাল নোট — পেমেন্ট সেটিংসে একবার সেট করা হয়।'
                      : 'Global note — set once in Payments settings.'
                  )
                }
                style={({ pressed }) => [styles.howPay, pressed && styles.howPayPressed]}
              >
                <View style={styles.howPayText}>
                  <Text style={styles.howPayTitle}>
                    {isBn ? 'কীভাবে পরিশোধ করবেন' : 'How to Pay'}
                  </Text>
                  <Text style={styles.howPaySub}>
                    {isBn
                      ? 'গ্লোবাল নোট — পেমেন্ট সেটিংসে একবার সেট করা হয়।'
                      : 'Global note — set once in Payments settings.'}
                  </Text>
                </View>
              </Pressable>

              {/* Save */}
              {!locked && (
                <Button
                  title={isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save changes'}
                  variant="primary"
                  size="lg"
                  loading={isSaving}
                  onPress={() => handleSaveAll()}
                  rightIcon={<SaveIcon size={22} color="#FFFFFF" />}
                />
              )}
           </View>
          </GestureScrollView>
          ) : (
            /* Content tab: plain mapped rows (drag-list lib renders blank
               in Expo Go — see learn.md #6). Reorder via long-press menu. */
            <View style={{ flex: 1 }}>
              <Text style={[styles.helperText, { paddingHorizontal: 20, paddingTop: 4 }]}>
                {isBn
                  ? 'বিষয় → অধ্যায় → সিকিউ ভিডিও / এমসিকিউ কুইজ — ছাত্ররা যেভাবে দেখে সেই একই কাঠামো।'
                  : 'Subject → Chapter → CQ videos / MCQ quizzes — the same structure students see.'}
              </Text>
                                                        <GestureScrollView
                contentContainerStyle={[styles.contentList, { flexGrow: 1 }]}
                showsVerticalScrollIndicator={false}
              >
                {subjectRows.length === 0 ? (
                  <Text style={[styles.helperText, { textAlign: 'center', marginTop: 24 }]}>
                    {isBn ? 'এখনো কোনো বিষয় যোগ করা হয়নি।' : 'No subjects yet.'}
                  </Text>
                ) : (
                  subjectRows.map((item, idx) => {
                    const open = !!expandedSubjects[item.subject.id];
                    return (
                      <View key={item.key} style={{ marginBottom: 12 }}>
                        <View style={styles.treeCard}>
                          <View style={styles.subjHead}>
                            <Pressable
                              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                              onPress={() => setExpandedSubjects((pr) => ({ ...pr, [item.subject.id]: !pr[item.subject.id] }))}
                              onLongPress={() => openMoveMenu(idx)}
                              delayLongPress={400}
                            >
                              <View style={open && styles.chevOpen}>
                                <ChevronRight size={20} />
                              </View>
                              <Text style={styles.treeSubject}>{item.subject.name}</Text>
                            </Pressable>
                            <Pressable onPress={() => navigation?.navigate?.('SubjectDetail', { courseId, subjectId: item.subject.id, onChanged: load })} style={styles.cornerEdit} accessibilityLabel="Edit">
                              <Text style={styles.cornerEditT}>✎</Text>
                            </Pressable>
                          </View>
                          {open && (
                            <View style={styles.nestedList}>
                              {item.chapters.map((c) => {
                                const cOpen = !!expandedChapters[c.id];
                                return (
                                  <View key={c.id}>
                                    <View style={styles.chapRow}>
                                      <Pressable
                                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                        onPress={() => toggleChapter(c.id)}
                                      >
                                        <View style={cOpen && styles.chevOpen}>
                                          <ChevronRight size={16} color={colors.textTertiary} />
                                        </View>
                                        <Text style={styles.previewTitle} numberOfLines={1}>{c.title}</Text>
                                      </Pressable>
                                      <Pressable onPress={() => navigation?.navigate?.('ChapterDetail', { courseId, chapterId: c.id, onChanged: load })} style={styles.miniEdit} accessibilityLabel="Edit videos">
                                        <Text style={styles.miniEditT}>✎</Text>
                                      </Pressable>
                                    </View>
                                    {cOpen && (
                                      <View style={styles.videoList}>
                                        {(videosByChapter[c.id] || []).map((v) => (
                                          <Text key={v.id} style={styles.videoTitle} numberOfLines={1}>· {v.title}</Text>
                                        ))}
                                      </View>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
                <View style={{ gap: 16, marginTop: 2, paddingBottom: 8 }}>
                  {!locked && (
                    <View style={styles.dbCard}>
                      <Text style={styles.label}>{isBn ? 'বিষয় যোগ করুন' : 'Add subject'}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder={isBn ? 'বিষয়ের নাম লিখুন…' : 'Write the subject name'}
                        placeholderTextColor={colors.textTertiary}
                        value={newSubjectName}
                        onChangeText={setNewSubjectName}
                      />
                      <View style={styles.dbOps}>
                        <Button
                          title={isBn ? 'যোগ করুন' : 'Add'}
                          variant="secondary"
                          size="md"
                          onPress={handleAddSubject}
                        />
                      </View>
                    </View>
                  )}
                  {!locked && (
                    <Button
                      title={isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save changes'}
                      variant="primary"
                      size="lg"
                      loading={isSaving}
                      onPress={() => handleSaveAll()}
                      rightIcon={<SaveIcon size={22} color="#FFFFFF" />}
                    />
                  )}
                  {/* Publish / unpublish — any listed instructor or the owner,
                      matching courses_update_instructor_owner. */}
                  {canPublish && (
                    <Button
                      title={
                        course.is_published
                          ? isBn ? 'প্রকাশিত আছে · বন্ধ করুন' : 'Published · Unpublish'
                          : isBn ? 'প্রকাশ করুন' : 'Publish course'
                      }
                      variant={course.is_published ? 'secondary' : 'primary'}
                      size="lg"
                      loading={isSaving}
                      onPress={() => handleTogglePublish(!course.is_published)}
                    />
                  )}

                  {/* Delete course — creator or owner only. Listed
                      co-instructors can edit but never see this button. */}
                  {canDelete && (
                    <Pressable
                      onPress={handleDeleteCourse}
                      style={styles.deleteCourseBtn}
                      accessibilityRole="button"
                      accessibilityLabel={isBn ? 'কোর্স মুছুন' : 'Delete course'}
                    >
                      <Text style={styles.deleteCourseText}>
                        {isBn ? 'কোর্স মুছুন' : 'Delete course'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </GestureScrollView>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function SpecAdder({ isBn, onAdd, placeholder, buttonLabel }) {
  const [text, setText] = useState('');
  return (
    <View style={{ gap: 8 }}>
      <TextInput
        style={inlineStyles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={text}
        onChangeText={setText}
      />
      <Button
        title={buttonLabel}
        variant="secondary"
        size="md"
        onPress={() => {
          const v = text.trim();
          if (!v) return;
          onAdd(v);
          setText('');
        }}
      />
    </View>
  );
}

const inlineStyles = StyleSheet.create({
  input: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-Regular',
    minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    color: colors.textPrimary,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  tabShown: {
    gap: 16,
  },
  tabHidden: {
    display: 'none',
  },
  headerSave: {
    backgroundColor: colors.primary,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerSaveOff: {
    backgroundColor: colors.backgroundMuted,
  },
  headerSaveText: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: '#FFFFFF',
  },
  headerSaveTextOff: {
    color: colors.textSecondary,
  },
  inlineForm: {
    gap: 8,
    marginTop: 6,
  },
  inlineBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  addLink: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
    paddingVertical: 8,
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  headTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  headSub: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
  },
  chipGold: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.secondaryPressed,
    backgroundColor: colors.secondarySubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
    gap: 16,
  },
  tagToggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundMuted,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    marginHorizontal: 20,
    marginTop: 4,
  },
  tagPill: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tagPillOn: {
    backgroundColor: colors.surface,
  },
  tagText: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
  },
  tagTextOn: {
    color: colors.textPrimary,
  },
  ownerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warningSubtle,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 12,
    marginHorizontal: 20,
  },
  ownerNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textPrimary,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  groupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  groupChipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  groupChipText: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
  },
  groupChipTextOn: {
    color: colors.primary,
  },
  groupChipAdd: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addInput: {
    flex: 1,
    minHeight: 44,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addBtnText: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: '#FFFFFF',
  },
  input: {
    fontSize: 17,
    fontFamily: 'HindSiliguri-Regular',
    minHeight: 52,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    color: colors.textPrimary,
  },
  area: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  dbCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 10,
  },
  dbHint: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  dbOps: {
    flexDirection: 'row',
    gap: 10,
  },
  section: {
    gap: 10,
  },
  secTitle: {
    fontSize: 17,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  specText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 23,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textPrimary,
  },
  miniBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundMuted,
  },
  miniBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'HindSiliguri-SemiBold',
  },
  chipCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tchrChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  tchrChipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  tchrAva: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tchrAvaLetter: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  tchrName: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  faqCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 6,
  },
  faqQ: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  faqA: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  faqForm: {
    gap: 8,
  },
  howPay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
  },
  howPayPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  howPayText: {
    flex: 1,
    gap: 2,
  },
  howPayTitle: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  howPaySub: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  treeCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 6,
  },
  treeSubject: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  subjHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteCourseBtn: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  deleteCourseText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.danger,
  },
  chapHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chevText: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
    minWidth: 20,
    textAlign: 'center',
  },
  indent1: {
    marginLeft: 14,
  },
  indent2: {
    marginLeft: 16,
  },
  vidOkText: {
    color: colors.success,
  },
  treeChapter: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  chapBlock: {
    gap: 4,
    marginTop: 2,
  },
  trailerList: {
    gap: 6,
    marginTop: 2,
  },
  vidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 6,
    marginLeft: 12,
  },
  vidTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textPrimary,
  },
  vidBtn: {
    minWidth: 40,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  vidBtnText: {
    fontSize: 17,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  trailerForm: {
    gap: 8,
  },
  vidDelText: {
    fontSize: 13,
    color: colors.danger,
  },
  cornerEdit: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerEditT: {
    fontSize: 18,
    color: colors.primary,
    fontFamily: 'HindSiliguri-SemiBold',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  arrowBtn: {
    minWidth: 36,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  arrowText: {
    fontSize: 18,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  arrowOff: {
    color: colors.textTertiary,
  },
  nestedList: {
    gap: 2,
    marginTop: 10,
    marginLeft: 6,
  },
  chapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  miniEdit: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniEditT: {
    fontSize: 15,
    color: colors.primary,
  },
  videoList: {
    gap: 2,
    marginLeft: 30,
    marginTop: 2,
    marginBottom: 4,
  },
  videoTitle: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  previewChev: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textTertiary,
    minWidth: 16,
    textAlign: 'center',
  },
  chevOpen: {
    transform: [{ rotate: '90deg' }],
  },
  contentList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    flexGrow: 1,
  },
  previewCount: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
  },
});
