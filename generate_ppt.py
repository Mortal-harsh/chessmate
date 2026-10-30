import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    # 16:9 widescreen format
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    blank_layout = prs.slide_layouts[6]

    # Theme colors
    BG_COLOR = RGBColor(11, 19, 43)        # #0B132B Dark Navy
    CARD_BG = RGBColor(23, 34, 69)         # #172245 Card Navy
    CARD_BORDER = RGBColor(56, 80, 140)    # Blue border
    GOLD = RGBColor(240, 192, 64)          # #F0C040 Gold
    BLUE = RGBColor(79, 156, 245)          # #4F9CF5 Accent Blue
    WHITE = RGBColor(240, 243, 246)        # Crisp White
    MUTED = RGBColor(160, 175, 205)        # Muted Text

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_COLOR
        bg.line.fill.background()

    def add_card(slide, left, top, width, height, title="", border_color=CARD_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = border_color
        card.line.width = Pt(1.5)
        
        if title:
            tb = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.15), width - Inches(0.4), Inches(0.5))
            tf = tb.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = title
            p.font.size = Pt(15)
            p.font.bold = True
            p.font.color.rgb = GOLD
        return card

    def add_header(slide, tag, title):
        # Category tag
        tb_tag = slide.shapes.add_textbox(Inches(0.8), Inches(0.45), Inches(11.5), Inches(0.4))
        tf_tag = tb_tag.text_frame
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = tag.upper()
        p_tag.font.size = Pt(12)
        p_tag.font.bold = True
        p_tag.font.color.rgb = GOLD
        
        # Main Title
        tb_title = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.5), Inches(0.6))
        tf_title = tb_title.text_frame
        p_title = tf_title.paragraphs[0]
        p_title.text = title
        p_title.font.size = Pt(26)
        p_title.font.bold = True
        p_title.font.color.rgb = WHITE

        # Watermark
        tb_wm = slide.shapes.add_textbox(Inches(9.5), Inches(0.45), Inches(3.0), Inches(0.4))
        p_wm = tb_wm.text_frame.paragraphs[0]
        p_wm.alignment = PP_ALIGN.RIGHT
        p_wm.text = "CHESSMATE PRO"
        p_wm.font.size = Pt(11)
        p_wm.font.bold = True
        p_wm.font.color.rgb = MUTED

    # ==========================================================
    # SLIDE 1: TITLE SLIDE
    # ==========================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)

    # Big Icon / Decorator
    tb_icon = s1.shapes.add_textbox(Inches(0.8), Inches(1.1), Inches(11.7), Inches(0.8))
    p_icon = tb_icon.text_frame.paragraphs[0]
    p_icon.text = "♜  ♚  ♟  ♙  ♖"
    p_icon.font.size = Pt(32)
    p_icon.font.color.rgb = GOLD

    # Supertitle
    tb_super = s1.shapes.add_textbox(Inches(0.8), Inches(1.9), Inches(11.7), Inches(0.4))
    p_super = tb_super.text_frame.paragraphs[0]
    p_super.text = "WEB PROGRAMMING PROJECT"
    p_super.font.size = Pt(14)
    p_super.font.bold = True
    p_super.font.color.rgb = BLUE

    # Title
    tb_main = s1.shapes.add_textbox(Inches(0.8), Inches(2.3), Inches(11.7), Inches(1.5))
    tf_main = tb_main.text_frame
    tf_main.word_wrap = True
    p_main = tf_main.paragraphs[0]
    p_main.text = "ChessMate PRO"
    p_main.font.size = Pt(44)
    p_main.font.bold = True
    p_main.font.color.rgb = GOLD

    p_sub = tf_main.add_paragraph()
    p_sub.text = "Advanced Real-Time Multiplayer & AI Chess Web Application"
    p_sub.font.size = Pt(22)
    p_sub.font.bold = True
    p_sub.font.color.rgb = WHITE

    # Team Card
    add_card(s1, Inches(0.8), Inches(4.3), Inches(7.2), Inches(2.2), "PROJECT TEAM")
    tb_team = s1.shapes.add_textbox(Inches(1.0), Inches(5.0), Inches(6.8), Inches(1.3))
    tf_team = tb_team.text_frame
    p1 = tf_team.paragraphs[0]
    p1.text = "• Harsh Raj  |  UID: 26MCA20215"
    p1.font.size = Pt(16)
    p1.font.bold = True
    p1.font.color.rgb = WHITE

    p2 = tf_team.add_paragraph()
    p2.text = "• Prince Raj  |  UID: 26MCA20216"
    p2.font.size = Pt(16)
    p2.font.bold = True
    p2.font.color.rgb = WHITE

    p3 = tf_team.add_paragraph()
    p3.text = "Master of Computer Applications (MCA)"
    p3.font.size = Pt(14)
    p3.font.color.rgb = MUTED

    # Repo Card
    add_card(s1, Inches(8.3), Inches(4.3), Inches(4.2), Inches(2.2), "GITHUB REPOSITORY")
    tb_repo = s1.shapes.add_textbox(Inches(8.5), Inches(5.0), Inches(3.8), Inches(1.3))
    tf_repo = tb_repo.text_frame
    pr = tf_repo.paragraphs[0]
    pr.text = "github.com/Mortal-harsh/chessmate"
    pr.font.size = Pt(15)
    pr.font.bold = True
    pr.font.color.rgb = BLUE

    pr2 = tf_repo.add_paragraph()
    pr2.text = "Open-Source Web Project"
    pr2.font.size = Pt(13)
    pr2.font.color.rgb = MUTED

    # ==========================================================
    # SLIDE 2: 01 | INTRODUCTION
    # ==========================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, "01 | Introduction", "Project Overview & Vision")

    tb_ov = s2.shapes.add_textbox(Inches(0.8), Inches(1.6), Inches(11.7), Inches(0.8))
    p_ov = tb_ov.text_frame.paragraphs[0]
    p_ov.text = "ChessMate PRO combines traditional chess rules with online multiplayer, computer-based AI play, and tactical position awareness tools in a single modern web platform."
    p_ov.font.size = Pt(18)
    p_ov.font.color.rgb = WHITE

    # 3 Cards: PLAY, PRACTICE, ANALYSE
    cards_data = [
        ("PLAY ⚔️", "Play real-time chess matches against an intelligent tactical computer engine or challenge friends online using private room codes.", Inches(0.8)),
        ("PRACTICE ♟️", "Use Self Play / Pass & Play to control both sides on one device with unlimited undo for opening rehearsals and personal training.", Inches(4.8)),
        ("ANALYSE 🔍", "Explore recognized openings in real-time, get tactical move recommendations, see danger threats, and export full PGN/FEN records.", Inches(8.8))
    ]
    for title, desc, left in cards_data:
        add_card(s2, left, Inches(2.6), Inches(3.7), Inches(3.8), title)
        tb_c = s2.shapes.add_textbox(left + Inches(0.25), Inches(3.4), Inches(3.2), Inches(2.6))
        tf_c = tb_c.text_frame
        tf_c.word_wrap = True
        pc = tf_c.paragraphs[0]
        pc.text = desc
        pc.font.size = Pt(16)
        pc.font.color.rgb = WHITE

    # ==========================================================
    # SLIDE 3: 02 | PURPOSE
    # ==========================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, "02 | Purpose", "Problem Statement & Project Objectives")

    # Problem Statement Card
    add_card(s3, Inches(0.8), Inches(1.7), Inches(5.6), Inches(4.8), "PROJECT NEED & PROBLEM")
    tb_need = s3.shapes.add_textbox(Inches(1.0), Inches(2.5), Inches(5.2), Inches(3.8))
    tf_need = tb_need.text_frame
    tf_need.word_wrap = True
    pn1 = tf_need.paragraphs[0]
    pn1.text = "Most existing chess platforms are either overly cluttered, require mandatory logins and payments, or lack accessible tactical learning features for beginners."
    pn1.font.size = Pt(16)
    pn1.font.color.rgb = WHITE

    pn2 = tf_need.add_paragraph()
    pn2.text = "ChessMate PRO provides a unified, zero-friction web platform where players can play, practice, chat, and review game situations without switching between separate tools."
    pn2.font.size = Pt(16)
    pn2.font.color.rgb = MUTED

    # Objectives Card
    add_card(s3, Inches(6.8), Inches(1.7), Inches(5.7), Inches(4.8), "PROJECT OBJECTIVES")
    tb_obj = s3.shapes.add_textbox(Inches(7.0), Inches(2.5), Inches(5.3), Inches(3.8))
    tf_obj = tb_obj.text_frame
    tf_obj.word_wrap = True
    objs = [
        "Support multiple gameplay modes (AI, Private Rooms, Matchmaking, Self Play).",
        "Enforce strict FIDE chess move legality and tournament end conditions.",
        "Enable low-latency, real-time multiplayer networking via WebSockets.",
        "Provide tactical coach hints, danger vision, and live opening detection.",
        "Allow seamless PGN and FEN game notation export for external analysis."
    ]
    for i, o in enumerate(objs):
        p = tf_obj.paragraphs[0] if i == 0 else tf_obj.add_paragraph()
        p.text = f"✔ {o}"
        p.font.size = Pt(15)
        p.font.color.rgb = WHITE

    # ==========================================================
    # SLIDE 4: 03 | TECHNOLOGY
    # ==========================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, "03 | Technology", "Modern & Scalable Tech Stack")

    tech_stack = [
        ("FRONTEND", "HTML5 • Modern CSS3 • JavaScript (ES6+)", "Glassmorphic responsive UI, CSS Grid board, dynamic SVG pieces, sound toggles, and zero external frontend bloatware.", Inches(0.8), Inches(1.8)),
        ("BACKEND", "Node.js • Express.js", "Lightweight, event-driven HTTP server managing static asset delivery, room states, and matchmaking queues.", Inches(6.8), Inches(1.8)),
        ("REAL-TIME", "Socket.IO", "Full-duplex WebSocket communication enabling instant move broadcasting, live chat, clock synchronization, and floating emoji reactions.", Inches(0.8), Inches(4.2)),
        ("CHESS ENGINE", "Chess.js & Web Audio API", "FIDE-compliant rule validation engine paired with Web Audio API for custom synthesized acoustic sounds for moves, checks, and captures.", Inches(6.8), Inches(4.2)),
    ]
    for title, subtitle, desc, left, top in tech_stack:
        add_card(s4, left, top, Inches(5.7), Inches(2.2), title)
        tb_t = s4.shapes.add_textbox(left + Inches(0.2), top + Inches(0.65), Inches(5.3), Inches(1.4))
        tf_t = tb_t.text_frame
        tf_t.word_wrap = True
        pt1 = tf_t.paragraphs[0]
        pt1.text = subtitle
        pt1.font.size = Pt(15)
        pt1.font.bold = True
        pt1.font.color.rgb = BLUE
        pt2 = tf_t.add_paragraph()
        pt2.text = desc
        pt2.font.size = Pt(13)
        pt2.font.color.rgb = WHITE

    # ==========================================================
    # SLIDE 5: 04 | DESIGN & ARCHITECTURE
    # ==========================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, "04 | Architecture", "High-Level System Design & Workflow")

    arch_steps = [
        ("BROWSER CLIENT", "Board UI • Controls • Sounds", "Renders chessboard, SVG pieces, moves, and local user interactions.", Inches(0.8)),
        ("SOCKET.IO LAYER", "Bi-directional WebSockets", "Carries real-time move payloads, chats, draw offers, and emojis.", Inches(3.8)),
        ("NODE / EXPRESS", "Rooms & Matchmaking", "Coordinates game sessions, reconnect grace periods, and AI requests.", Inches(6.8)),
        ("CHESS RULES LAYER", "Chess.js FIDE Validation", "Validates moves, detects check/checkmate/draws, and updates FEN state.", Inches(9.8))
    ]
    for title, sub, desc, left in arch_steps:
        add_card(s5, left, Inches(1.8), Inches(2.7), Inches(4.8), title)
        tb_a = s5.shapes.add_textbox(left + Inches(0.15), Inches(2.6), Inches(2.4), Inches(3.7))
        tf_a = tb_a.text_frame
        tf_a.word_wrap = True
        pa1 = tf_a.paragraphs[0]
        pa1.text = sub
        pa1.font.size = Pt(14)
        pa1.font.bold = True
        pa1.font.color.rgb = BLUE
        pa2 = tf_a.add_paragraph()
        pa2.text = desc
        pa2.font.size = Pt(13)
        pa2.font.color.rgb = WHITE

    # ==========================================================
    # SLIDE 6: 05 | GAMEPLAY MODES
    # ==========================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, "05 | Gameplay", "Comprehensive Game Modes")

    modes = [
        ("🤖 Play vs Computer", "Play against an offline Minimax AI engine. Offers 3 calibrated difficulty settings (Easy, Medium, Hard) suitable for all skill levels.", Inches(0.8), Inches(1.8)),
        ("🔑 Private Room", "Generate a shareable 6-character room code. Friends can instantly connect across devices without any account creation.", Inches(6.8), Inches(1.8)),
        ("🌐 Random Matchmaking", "Join an automated matchmaking queue to get paired in real-time with available online opponents.", Inches(0.8), Inches(4.3)),
        ("♟️ Self Play / Pass & Play", "Play locally on a single device controlling both White and Black. Includes unlimited step-by-step move undo.", Inches(6.8), Inches(4.3)),
    ]
    for title, desc, left, top in modes:
        add_card(s6, left, top, Inches(5.7), Inches(2.2), title)
        tb_m = s6.shapes.add_textbox(left + Inches(0.2), top + Inches(0.7), Inches(5.3), Inches(1.3))
        tf_m = tb_m.text_frame
        tf_m.word_wrap = True
        pm = tf_m.paragraphs[0]
        pm.text = desc
        pm.font.size = Pt(15)
        pm.font.color.rgb = WHITE

    # ==========================================================
    # SLIDE 7: 06 | RULES ENGINE
    # ==========================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header(s7, "06 | Rules Engine", "FIDE Legal Move Validation")

    add_card(s7, Inches(0.8), Inches(1.8), Inches(6.8), Inches(4.8), "SUPPORTED CHESS RULES")
    tb_rules = s7.shapes.add_textbox(Inches(1.0), Inches(2.5), Inches(6.4), Inches(3.8))
    tf_rules = tb_rules.text_frame
    tf_rules.word_wrap = True
    rule_items = [
        "Piece movement & capture validation for Pawns, Knights, Bishops, Rooks, Queen & King.",
        "Check, checkmate, stalemate, and 50-move rule detection.",
        "Threefold repetition & insufficient material draw evaluations.",
        "Castling (both Kingside O-O and Queenside O-O-O) with path obstruction checks.",
        "En Passant pawn captures.",
        "Interactive Pawn Promotion modal (choose Queen, Rook, Bishop, or Knight)."
    ]
    for i, r in enumerate(rule_items):
        p = tf_rules.paragraphs[0] if i == 0 else tf_rules.add_paragraph()
        p.text = f"✔ {r}"
        p.font.size = Pt(14)
        p.font.color.rgb = WHITE

    add_card(s7, Inches(8.0), Inches(1.8), Inches(4.5), Inches(4.8), "MOVE VALIDATION FLOW")
    tb_flow = s7.shapes.add_textbox(Inches(8.2), Inches(2.5), Inches(4.1), Inches(3.8))
    tf_flow = tb_flow.text_frame
    tf_flow.word_wrap = True
    flows = [
        "1. Select Piece: Highlights legal moves with green dots.",
        "2. Check Legality: Prevents moving pinned pieces.",
        "3. Validate King Safety: Rejects moves leaving King in check.",
        "4. Execute & Update: Plays move sound and broadcasts FEN state."
    ]
    for i, f in enumerate(flows):
        p = tf_flow.paragraphs[0] if i == 0 else tf_flow.add_paragraph()
        p.text = f
        p.font.size = Pt(14)
        p.font.color.rgb = GOLD if i % 2 == 0 else WHITE

    # ==========================================================
    # SLIDE 8: 07 | COMPUTER OPPONENT (AI ENGINE)
    # ==========================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header(s8, "07 | AI Opponent", "Minimax Search Engine with Alpha-Beta Pruning")

    ai_cards = [
        ("MINIMAX ALGORITHM", "Calculates recursive decision trees comparing future move sequences, selecting lines that maximize AI score while minimizing opponent advantages.", Inches(0.8)),
        ("ALPHA-BETA PRUNING", "Drastically cuts down the search tree by eliminating branches that cannot influence the final decision, speeding up response times.", Inches(4.8)),
        ("PIECE-SQUARE TABLES (PST)", "Combines material points (P:100, N:320, B:330, R:500, Q:900) with positional heatmaps rewarding central control and king safety.", Inches(8.8))
    ]
    for title, desc, left in ai_cards:
        add_card(s8, left, Inches(1.8), Inches(3.7), Inches(4.8), title)
        tb_ai = s8.shapes.add_textbox(left + Inches(0.2), Inches(2.6), Inches(3.3), Inches(3.7))
        tf_ai = tb_ai.text_frame
        tf_ai.word_wrap = True
        p = tf_ai.paragraphs[0]
        p.text = desc
        p.font.size = Pt(16)
        p.font.color.rgb = WHITE

    # ==========================================================
    # SLIDE 9: 08 | TACTICAL ASSISTANCE (AI COACH HINT)
    # ==========================================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9)
    add_header(s9, "08 | Tactical Assistance", "AI Tactical Coach / Smart Move Hint")

    add_card(s9, Inches(0.8), Inches(1.8), Inches(6.0), Inches(4.8), "COACH HINT CAPABILITIES")
    tb_ch = s9.shapes.add_textbox(Inches(1.0), Inches(2.5), Inches(5.6), Inches(3.8))
    tf_ch = tb_ch.text_frame
    tf_ch.word_wrap = True
    ch_items = [
        "Real-Time Evaluation: Evaluates current tactical opportunities on demand.",
        "Visual Highlighting: Illuminates source square in glowing cyan and target square with an animated bullseye (🎯).",
        "Clear Tactical Reasons: Explains why the move is recommended in plain English.",
        "Interactive Learning: Helps players discover checks, forks, pins, and central control."
    ]
    for i, it in enumerate(ch_items):
        p = tf_ch.paragraphs[0] if i == 0 else tf_ch.add_paragraph()
        p.text = f"• {it}"
        p.font.size = Pt(15)
        p.font.color.rgb = WHITE

    add_card(s9, Inches(7.2), Inches(1.8), Inches(5.3), Inches(4.8), "SAMPLE TACTICAL INSIGHTS")
    tb_ex = s9.shapes.add_textbox(Inches(7.4), Inches(2.5), Inches(4.9), Inches(3.8))
    tf_ex = tb_ex.text_frame
    tf_ex.word_wrap = True
    examples = [
        ("🎯 Central Domination", "“Occupies critical d4 central square to dominate board space.”"),
        ("⚡ Tactical Fork / Check", "“Checks the enemy King, putting intense pressure!”"),
        ("🛡️ King Protection", "“Castles King to safety and connects the Rooks.”"),
        ("💰 Undefended Material", "“Captures undefended Bishop (+3 pts) on e5.”")
    ]
    for i, (title, quote) in enumerate(examples):
        p1 = tf_ex.paragraphs[0] if i == 0 else tf_ex.add_paragraph()
        p1.text = title
        p1.font.size = Pt(14)
        p1.font.bold = True
        p1.font.color.rgb = GOLD
        p2 = tf_ex.add_paragraph()
        p2.text = quote
        p2.font.size = Pt(13)
        p2.font.color.rgb = MUTED

    # ==========================================================
    # SLIDE 10: 09 | POSITION AWARENESS (DANGER VISION)
    # ==========================================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10)
    add_header(s10, "09 | Position Awareness", "Danger Vision & Threat Radar")

    tb_dv_intro = s10.shapes.add_textbox(Inches(0.8), Inches(1.6), Inches(11.7), Inches(0.8))
    p_dv = tb_dv_intro.text_frame.paragraphs[0]
    p_dv.text = "Danger Vision provides real-time raycasting radar to help players avoid blunders by visualizing attacked territory and exposed pieces."
    p_dv.font.size = Pt(17)
    p_dv.font.color.rgb = WHITE

    dv_cards = [
        ("ATTACKED SQUARES 🛡️", "Raycasts all attacking lines from opponent pieces (pawns, knights, bishops, rooks, queen) and highlights them with subtle danger radar.", Inches(0.8)),
        ("HANGING PIECES ⚠️", "Detects player pieces currently located on attacked squares that have no friendly defenders, triggering animated red hazard warnings.", Inches(4.8)),
        ("ONE-CLICK TOGGLE 🔘", "Players can seamlessly switch Danger Vision on or off with a dedicated control button without interrupting game flow.", Inches(8.8))
    ]
    for title, desc, left in dv_cards:
        add_card(s10, left, Inches(2.6), Inches(3.7), Inches(3.8), title)
        tb_c = s10.shapes.add_textbox(left + Inches(0.2), Inches(3.4), Inches(3.3), Inches(2.6))
        tf_c = tb_c.text_frame
        tf_c.word_wrap = True
        p = tf_c.paragraphs[0]
        p.text = desc
        p.font.size = Pt(16)
        p.font.color.rgb = WHITE

    # ==========================================================
    # SLIDE 11: 10 | STUDY & RECORDS (OPENING & EXPORT)
    # ==========================================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11)
    add_header(s11, "10 | Study & Records", "Live Opening Explorer & PGN/FEN Export")

    add_card(s11, Inches(0.8), Inches(1.8), Inches(5.7), Inches(4.8), "📖 OPENING BOOK EXPLORER")
    tb_op = s11.shapes.add_textbox(Inches(1.0), Inches(2.5), Inches(5.3), Inches(3.8))
    tf_op = tb_op.text_frame
    tf_op.word_wrap = True
    ops = [
        "Recognizes 50+ classic & modern chess openings and variations in real-time.",
        "Displays live glowing badge above the board as moves are played.",
        "Covers Italian Game, Sicilian (Najdorf/Dragon), Ruy Lopez, Queen's Gambit, King's Indian, London System, French, Caro-Kann, etc."
    ]
    for i, o in enumerate(ops):
        p = tf_op.paragraphs[0] if i == 0 else tf_op.add_paragraph()
        p.text = f"✔ {o}"
        p.font.size = Pt(15)
        p.font.color.rgb = WHITE

    add_card(s11, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.8), "📋 PGN & FEN EXPORT SUITE")
    tb_exp = s11.shapes.add_textbox(Inches(7.0), Inches(2.5), Inches(5.3), Inches(3.8))
    tf_exp = tb_exp.text_frame
    tf_exp.word_wrap = True
    exps = [
        "PGN Generator: Exports full standard notation with event headers, dates, player names, and move history.",
        "FEN Copying: Instant one-click copy of the active board position in FEN format.",
        "Download .pgn File: Direct file download to analyze games in Chess.com, Lichess, or Stockfish."
    ]
    for i, e in enumerate(exps):
        p = tf_exp.paragraphs[0] if i == 0 else tf_exp.add_paragraph()
        p.text = f"✔ {e}"
        p.font.size = Pt(15)
        p.font.color.rgb = WHITE

    # ==========================================================
    # SLIDE 12: 11 | MULTIPLAYER & QOL FEATURES
    # ==========================================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12)
    add_header(s12, "11 | User Experience", "Multiplayer Polish & Quality-of-Life Features")

    qol_cards = [
        ("💬 Live Chat & Emojis", "In-game messaging and floating animated emoji reactions (👏, 🤔, 😅, 🎉, 😤, 🤝).", Inches(0.8), Inches(1.8)),
        ("⏱️ Dual Blitz Clocks", "Tabular digital countdown timers with flashing red alerts when remaining time falls below 30s.", Inches(6.8), Inches(1.8)),
        ("🎨 4 Board Themes", "Royal Walnut (Wood), Emerald Master (Green), Cyber Neon, and Amethyst Frost.", Inches(0.8), Inches(4.2)),
        ("📊 Material Advantage Bar", "Real-time dynamic eval bar showing piece advantage score between White and Black.", Inches(6.8), Inches(4.2)),
    ]
    for title, desc, left, top in qol_cards:
        add_card(s12, left, top, Inches(5.7), Inches(2.2), title)
        tb_q = s12.shapes.add_textbox(left + Inches(0.2), top + Inches(0.7), Inches(5.3), Inches(1.3))
        tf_q = tb_q.text_frame
        tf_q.word_wrap = True
        pq = tf_q.paragraphs[0]
        pq.text = desc
        pq.font.size = Pt(15)
        pq.font.color.rgb = WHITE

    # ==========================================================
    # SLIDE 13: 12 | PROJECT SUMMARY & FUTURE SCOPE
    # ==========================================================
    s13 = prs.slides.add_slide(blank_layout)
    set_slide_background(s13)
    add_header(s13, "12 | Summary", "Key Benefits & Future Enhancements")

    add_card(s13, Inches(0.8), Inches(1.8), Inches(5.7), Inches(4.8), "PROJECT ACHIEVEMENTS")
    tb_ach = s13.shapes.add_textbox(Inches(1.0), Inches(2.5), Inches(5.3), Inches(3.8))
    tf_ach = tb_ach.text_frame
    tf_ach.word_wrap = True
    achs = [
        "Unified Platform: Seamlessly merges play, learning, and analysis without paid subscriptions.",
        "Zero Latency: Socket.IO protocol ensures instantaneous move and clock updates.",
        "Tactical Assistance: Tactical coach hints and threat radar empower beginners.",
        "Standard Export: Full interoperability with international chess platforms."
    ]
    for i, a in enumerate(achs):
        p = tf_ach.paragraphs[0] if i == 0 else tf_ach.add_paragraph()
        p.text = f"⭐ {a}"
        p.font.size = Pt(15)
        p.font.color.rgb = WHITE

    add_card(s13, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.8), "FUTURE ROADMAP")
    tb_fut = s13.shapes.add_textbox(Inches(7.0), Inches(2.5), Inches(5.3), Inches(3.8))
    tf_fut = tb_fut.text_frame
    tf_fut.word_wrap = True
    futs = [
        "ELO Rating & Leaderboard system for competitive player rankings.",
        "Deep Stockfish WASM integration for multi-engine deep post-game analysis.",
        "Interactive Chess Puzzle Trainer & Daily Tactics.",
        "Progressive Web App (PWA) support for offline mobile app installation."
    ]
    for i, f in enumerate(futs):
        p = tf_fut.paragraphs[0] if i == 0 else tf_fut.add_paragraph()
        p.text = f"🚀 {f}"
        p.font.size = Pt(15)
        p.font.color.rgb = WHITE

    # ==========================================================
    # SLIDE 14: CONCLUSION & THANK YOU
    # ==========================================================
    s14 = prs.slides.add_slide(blank_layout)
    set_slide_background(s14)

    tb_c_icon = s14.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(11.7), Inches(0.8))
    p_c_icon = tb_c_icon.text_frame.paragraphs[0]
    p_c_icon.text = "👑  ChessMate PRO  👑"
    p_c_icon.font.size = Pt(28)
    p_c_icon.font.bold = True
    p_c_icon.font.color.rgb = GOLD

    tb_ty = s14.shapes.add_textbox(Inches(0.8), Inches(2.0), Inches(11.7), Inches(1.2))
    p_ty = tb_ty.text_frame.paragraphs[0]
    p_ty.text = "Thank You!"
    p_ty.font.size = Pt(48)
    p_ty.font.bold = True
    p_ty.font.color.rgb = WHITE

    p_qd = tb_ty.text_frame.add_paragraph()
    p_qd.text = "Questions & Discussion"
    p_qd.font.size = Pt(22)
    p_qd.font.color.rgb = BLUE

    # Summary box
    add_card(s14, Inches(0.8), Inches(3.6), Inches(11.7), Inches(2.8), "PROJECT SUMMARY & CREDITS")
    tb_cred = s14.shapes.add_textbox(Inches(1.0), Inches(4.3), Inches(11.3), Inches(1.8))
    tf_cred = tb_cred.text_frame
    tf_cred.word_wrap = True
    pcr1 = tf_cred.paragraphs[0]
    pcr1.text = "ChessMate PRO successfully demonstrates real-time web development, AI search algorithms, WebSocket communication, and responsive modern UI design."
    pcr1.font.size = Pt(16)
    pcr1.font.color.rgb = WHITE

    pcr2 = tf_cred.add_paragraph()
    pcr2.text = "Project Team: Harsh Raj (UID: 26MCA20215)  •  Prince Raj (UID: 26MCA20216)"
    pcr2.font.size = Pt(16)
    pcr2.font.bold = True
    pcr2.font.color.rgb = GOLD

    pcr3 = tf_cred.add_paragraph()
    pcr3.text = "GitHub Repository: https://github.com/Mortal-harsh/chessmate"
    pcr3.font.size = Pt(15)
    pcr3.font.color.rgb = BLUE

    output_path = "ChessMate_PRO_Presentation.pptx"
    prs.save(output_path)
    print(f"Presentation saved successfully to {output_path}")

if __name__ == '__main__':
    create_presentation()
