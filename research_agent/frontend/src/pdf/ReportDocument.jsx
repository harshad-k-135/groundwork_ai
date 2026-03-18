import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#0A0D14",
    color: "#FFFFFF",
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.6,
  },
  titlePage: {
    backgroundColor: "#0A0D14",
    color: "#FFFFFF",
    paddingTop: 120,
    paddingHorizontal: 60,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    marginBottom: 12,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: -1,
  },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  meta: {
    color: "#F5A623",
    fontSize: 10,
    marginBottom: 4,
    fontFamily: "Courier",
    fontWeight: "bold",
  },
  sectionTitle: {
    color: "#FFFFFF",
    marginTop: 24,
    marginBottom: 12,
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    paddingBottom: 4,
  },
  summaryBlock: {
    borderLeftWidth: 3,
    borderLeftColor: "#F5A623",
    paddingLeft: 16,
    marginVertical: 12,
  },
  body: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: "#FFFFFF",
  },
  paperRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  paperTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#F5A623",
    marginBottom: 4,
  },
  paperMeta: {
    marginBottom: 6,
    color: "rgba(255,255,255,0.6)",
    fontSize: 9,
    fontFamily: "Courier",
  },
  paperBody: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 9.5,
    marginBottom: 6,
  },
  sourceBadge: {
    marginTop: 4,
    color: "#F5A623",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
  },
  relatedTopic: {
    marginBottom: 6,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Courier",
    fontSize: 9,
  },
});

export default function ReportDocument({ topic, summary, papers, relatedTopics, totalFound }) {
  const now = new Date().toLocaleString();
  const sourceMap = {
    arxiv: "ArXiv",
    semantic_scholar: "Semantic Scholar",
    tavily: "Web",
    unverified: "Unverified Web",
  };
  const sourceLabels = Array.from(new Set((papers || []).map((paper) => sourceMap[paper.source] || "Web"))).join(
    " / "
  );

  return (
    <Document>
      <Page size="A4" style={styles.titlePage}>
        <Text style={styles.title}>GROUNDWORK AI</Text>
        <Text style={styles.subtitle}>{topic}</Text>
        <Text style={styles.subtitle}>Generated on {now}</Text>
        <Text style={styles.meta}>Total papers: {totalFound ?? papers.length}</Text>
        <Text style={styles.meta}>Sources: {sourceLabels || "N/A"}</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Field Summary</Text>

        <View style={styles.summaryBlock}>
          <Text style={styles.body}>{summary || "N/A"}</Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Papers Found</Text>
        {papers.map((paper, index) => (
          <View key={`${paper.paper_url || paper.title}-${index}`} style={styles.paperRow}>
            <Text style={styles.paperTitle}>{paper.title || "Untitled"}</Text>
            <Text style={styles.paperMeta}>Authors: {(paper.authors || []).join(", ") || "Unknown"}</Text>
            <Text style={styles.paperBody}>{paper.abstract || "No abstract available."}</Text>
            <Text style={styles.paperBody}>Paper URL: {paper.paper_url || "N/A"}</Text>
            {paper.pdf_url ? <Text style={styles.paperBody}>PDF URL: {paper.pdf_url}</Text> : null}
            <Text style={styles.paperBody}>Relevance: {(paper.relevance_tag || "tangential").toUpperCase()}</Text>
            <Text style={styles.sourceBadge}>Source: {(paper.source || "web").toUpperCase()}</Text>
          </View>
        ))}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Related Topics</Text>
        {(relatedTopics || []).map((topicItem) => (
          <Text key={topicItem} style={styles.relatedTopic}>
            • {topicItem}
          </Text>
        ))}
      </Page>
    </Document>
  );
}
