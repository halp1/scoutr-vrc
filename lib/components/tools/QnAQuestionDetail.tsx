import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  Linking,
} from "react-native";
import { HTMLElement, TextNode, parse } from "node-html-parser";
import { ExternalLink, X } from "lucide-react-native";
import { colors, font, radius, spacing } from "../../theme";
import type { QnaQuestion } from "./qnaData";
import { resolveImageUri, syncQnaQuestions } from "./qnaData";
import { ImageViewerModal } from "./ImageViewer";
import { getManual, isManualCached, type ManualEntry } from "./gameManual";
import { RuleDrawer } from "./RuleDrawer";
import { useToolsData } from "./ToolsDataContext";

interface Props {
  question: QnaQuestion | null;
  visible: boolean;
  onClose: () => void;
}

const formatDate = (value: number | null): string => {
  if (!value) return "Unknown date";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Unknown date";
  }
};

const programColor = (program: string): string => {
  switch (program.trim().toLowerCase()) {
    case "v5rc":
      return colors.red;
    case "vurc":
      return colors.blue;
    case "judging":
      return colors.yellow;
    default:
      return colors.mutedForeground;
  }
};

const extractInlineText = (el: HTMLElement): string => {
  return el.text.replace(/\s+/g, " ").trim();
};

const RULE_REF_RE = /(<[A-Z][A-Z0-9]{0,8}>)/g;

const renderInlineText = (
  text: string,
  onRuleRef: (code: string) => void,
  keyPrefix: string,
): React.ReactNode => {
  const parts = text.split(RULE_REF_RE);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    const m = /^<([A-Z][A-Z0-9]{0,8})>$/.exec(part);
    if (m) {
      return (
        <Text
          key={`${keyPrefix}-r${i}`}
          style={styles.ruleRef}
          onPress={() => onRuleRef(m[1])}
        >
          {part}
        </Text>
      );
    }
    return part || null;
  });
};

const HtmlSection = ({
  html,
  onImagePress,
  onRuleRef,
}: {
  html: string;
  onImagePress: (uri: string) => void;
  onRuleRef: (code: string) => void;
}) => {
  const nodes = useMemo(() => parse(html).childNodes, [html]);

  const renderList = (el: HTMLElement, ordered: boolean) => {
    const items = el.childNodes.filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.tagName.toLowerCase() === "li",
    );
    return items.map((item, idx) => (
      <Text key={`${ordered ? "ol" : "ul"}-${idx}`} style={styles.listItem}>
        {ordered ? `${idx + 1}. ` : "\u2022 "}
        {renderInlineText(extractInlineText(item), onRuleRef, `li-${idx}`)}
      </Text>
    ));
  };

  return (
    <View style={styles.htmlSection}>
      {nodes.map((node, idx) => {
        if (node instanceof TextNode) {
          const text = node.rawText.replace(/\s+/g, " ").trim();
          if (!text) return null;
          return (
            <Text key={`text-${idx}`} style={styles.bodyText}>
              {renderInlineText(text, onRuleRef, `text-${idx}`)}
            </Text>
          );
        }
        if (!(node instanceof HTMLElement)) return null;
        const tag = node.tagName.toLowerCase();
        if (tag === "p") {
          const imgInP = node.childNodes.find(
            (c): c is HTMLElement =>
              c instanceof HTMLElement && c.tagName.toLowerCase() === "img",
          );
          if (imgInP) {
            const src = imgInP.getAttribute("src");
            if (src) {
              const resolved = resolveImageUri(
                src.startsWith("//") ? `https:${src}` : src,
              );
              return (
                <Pressable key={`p-img-${idx}`} onPress={() => onImagePress(resolved)}>
                  <Image
                    source={{ uri: resolved }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                </Pressable>
              );
            }
          }
          return (
            <Text key={`p-${idx}`} style={styles.bodyText}>
              {renderInlineText(extractInlineText(node), onRuleRef, `p-${idx}`)}
            </Text>
          );
        }
        if (tag === "blockquote") {
          return (
            <View key={`bq-${idx}`} style={styles.blockquote}>
              <Text style={styles.blockquoteText}>
                {renderInlineText(extractInlineText(node), onRuleRef, `bq-${idx}`)}
              </Text>
            </View>
          );
        }
        if (tag === "ul") {
          return <View key={`ul-${idx}`}>{renderList(node, false)}</View>;
        }
        if (tag === "ol") {
          return <View key={`ol-${idx}`}>{renderList(node, true)}</View>;
        }
        if (tag === "pre" || tag === "code") {
          return (
            <View key={`code-${idx}`} style={styles.codeWrap}>
              <Text style={styles.codeText}>{node.text}</Text>
            </View>
          );
        }
        if (/^h[1-6]$/.test(tag)) {
          return (
            <Text key={`h-${idx}`} style={styles.headingText}>
              {renderInlineText(extractInlineText(node), onRuleRef, `h-${idx}`)}
            </Text>
          );
        }
        if (tag === "img") {
          const src = node.getAttribute("src");
          if (!src) return null;
          const normalized = src.startsWith("//") ? `https:${src}` : src;
          const resolved = resolveImageUri(normalized);
          return (
            <Pressable key={`img-${idx}`} onPress={() => onImagePress(resolved)}>
              <Image
                source={{ uri: resolved }}
                style={styles.image}
                resizeMode="contain"
              />
            </Pressable>
          );
        }
        if (tag === "a") {
          const href = node.getAttribute("href");
          const label = extractInlineText(node);
          if (!href) {
            return (
              <Text key={`a-${idx}`} style={styles.bodyText}>
                {label}
              </Text>
            );
          }
          return (
            <Text
              key={`a-${idx}`}
              style={styles.linkText}
              onPress={() => {
                void Linking.openURL(href);
              }}
            >
              {label || href}
            </Text>
          );
        }
        return (
          <Text key={`d-${idx}`} style={styles.bodyText}>
            {renderInlineText(extractInlineText(node), onRuleRef, `p-${idx}`)}
          </Text>
        );
      })}
    </View>
  );
};

export const QnAQuestionDetail = ({ question, visible, onClose }: Props) => {
  const { navigateToManualEntry } = useToolsData();
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [ruleEntry, setRuleEntry] = useState<ManualEntry | null>(null);
  const [ruleVisible, setRuleVisible] = useState(false);
  const [ruleLoading, setRuleLoading] = useState(false);
  const ruleStackRef = useRef<ManualEntry[]>([]);

  const handleRuleRef = useCallback(async (code: string) => {
    const needsLoad = !isManualCached();
    if (needsLoad) setRuleLoading(true);
    try {
      const data = await getManual();
      const entry = data.ruleMap[code.toLowerCase()] ?? null;
      if (entry) {
        ruleStackRef.current = [];
        setRuleEntry(entry);
        setRuleVisible(true);
      }
    } catch {}
    if (needsLoad) setRuleLoading(false);
  }, []);

  const handleCrossRef = useCallback(
    async (code: string) => {
      try {
        const data = await getManual();
        const entry = data.ruleMap[code.toLowerCase()] ?? null;
        if (entry) {
          if (ruleEntry) ruleStackRef.current.push(ruleEntry);
          setRuleEntry(entry);
        }
      } catch {}
    },
    [ruleEntry],
  );

  const handleRuleClose = useCallback(() => {
    const prev = ruleStackRef.current.pop();
    if (prev) {
      setRuleEntry(prev);
    } else {
      setRuleVisible(false);
      setRuleEntry(null);
    }
  }, []);

  const handleNavigateToSource = useCallback(
    (entry: ManualEntry) => {
      ruleStackRef.current = [];
      setRuleVisible(false);
      setRuleEntry(null);
      onClose();
      navigateToManualEntry(entry);
    },
    [onClose, navigateToManualEntry],
  );

  const handleQnaRef = useCallback(async (id: string) => {
    const result = await syncQnaQuestions();
    const q = result.questions.find((item) => item.id === id) ?? null;
    if (q) {
      setNestedQnaQuestion(q);
      setNestedQnaVisible(true);
    }
  }, []);

  const [nestedQnaQuestion, setNestedQnaQuestion] = useState<QnaQuestion | null>(null);
  const [nestedQnaVisible, setNestedQnaVisible] = useState(false);

  if (!question) return null;
  const programBadgeColor = programColor(question.program);

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View
                style={[
                  styles.programBadge,
                  { backgroundColor: `${programBadgeColor}25` },
                ]}
              >
                <Text style={[styles.programBadgeText, { color: programBadgeColor }]}>
                  {question.program.toUpperCase()}
                </Text>
              </View>
              <Pressable style={styles.iconBtn} onPress={onClose}>
                <X size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
            >
              <Text style={styles.title}>{question.title}</Text>
              <Text style={styles.meta}>
                {question.author || "Unknown author"} ·{" "}
                {question.season || "Unknown season"} · Asked{" "}
                {formatDate(question.askedTimestampMs)}
              </Text>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Question</Text>
                <HtmlSection
                  html={question.questionRaw || question.question}
                  onImagePress={setViewerSrc}
                  onRuleRef={handleRuleRef}
                />
              </View>
              {question.answered ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Answer</Text>
                  <HtmlSection
                    html={question.answerRaw || question.answer}
                    onImagePress={setViewerSrc}
                    onRuleRef={handleRuleRef}
                  />
                </View>
              ) : (
                <View style={styles.unansweredWrap}>
                  <Text style={styles.unansweredText}>No official answer yet.</Text>
                </View>
              )}
              <Pressable
                style={styles.sourceBtn}
                onPress={() => {
                  if (question.url) {
                    void Linking.openURL(question.url);
                  }
                }}
              >
                <ExternalLink size={16} color={colors.primary} />
                <Text style={styles.sourceText}>Open on RobotEvents</Text>
              </Pressable>
            </ScrollView>
            {ruleLoading ? (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading game manual...</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
      {viewerSrc ? (
        <ImageViewerModal
          src={viewerSrc}
          alt="Q&A image"
          onClose={() => setViewerSrc(null)}
        />
      ) : null}
      <RuleDrawer
        entry={ruleEntry}
        visible={ruleVisible}
        onClose={handleRuleClose}
        onCrossRef={handleCrossRef}
        onQnaRef={handleQnaRef}
        onNavigateToSource={handleNavigateToSource}
      />
      <QnAQuestionDetail
        question={nestedQnaQuestion}
        visible={nestedQnaVisible}
        onClose={() => setNestedQnaVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    height: "85%",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  programBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  programBadgeText: {
    fontSize: font.sm,
    fontWeight: "700",
  },
  iconBtn: {
    padding: spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["3xl"],
    gap: spacing.md,
  },
  title: {
    fontSize: font.lg,
    fontWeight: "700",
    color: colors.foreground,
    lineHeight: 24,
  },
  meta: {
    fontSize: font.sm,
    color: colors.mutedForeground,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: font.md,
    fontWeight: "700",
    color: colors.foreground,
  },
  htmlSection: {
    gap: spacing.sm,
  },
  bodyText: {
    fontSize: font.base,
    lineHeight: 22,
    color: colors.foreground,
  },
  headingText: {
    fontSize: font.md,
    fontWeight: "700",
    lineHeight: 24,
    color: colors.foreground,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.sm,
  },
  blockquoteText: {
    fontSize: font.base,
    lineHeight: 22,
    color: colors.mutedForeground,
  },
  listItem: {
    fontSize: font.base,
    lineHeight: 22,
    color: colors.foreground,
  },
  codeWrap: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  codeText: {
    fontSize: font.sm,
    lineHeight: 19,
    color: colors.foreground,
    fontFamily: "monospace",
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  linkText: {
    fontSize: font.base,
    lineHeight: 22,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  unansweredWrap: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  unansweredText: {
    fontSize: font.base,
    color: colors.mutedForeground,
  },
  sourceBtn: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  sourceText: {
    fontSize: font.base,
    fontWeight: "700",
    color: colors.primary,
  },
  ruleRef: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: font.base,
    lineHeight: 22,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: font.base,
    color: colors.foreground,
  },
});
