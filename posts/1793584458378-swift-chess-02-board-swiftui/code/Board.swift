// Board.swift — modelo, geometría y capas del tablero (SwiftUI puro, sin TCA).
// Ejemplo reescrito y reducido para el artículo «Anatomía de un tablero de ajedrez en SwiftUI».
// La versión con TCA (estado, acciones y arrastre) está en BoardFeature.swift.

import SwiftUI

// MARK: - Model (minimal, for the article)

enum PieceKind: CaseIterable, Sendable { case king, queen, rook, bishop, knight, pawn }

enum PieceColor: Sendable {
    case white, black
    var opponent: PieceColor { self == .white ? .black : .white }
}

enum Orientation: Sendable { case white, black }

enum PieceStyle: Equatable, Sendable { case glyphs, letters }

struct Square: Hashable, Identifiable, Sendable {
    let file: Int   // 0 = a … 7 = h
    let rank: Int   // 0 = 1 … 7 = 8

    var id: Int { rank * 8 + file }
    var isLight: Bool { (file + rank) % 2 == 1 }

    static let all: [Square] = (0..<64).map { Square(file: $0 % 8, rank: $0 / 8) }
}

/// A piece keeps its `id` for the whole game, so SwiftUI can animate it between squares.
struct BoardPiece: Identifiable, Equatable, Sendable {
    let id: Int
    let kind: PieceKind
    let color: PieceColor
    var square: Square

    func symbol(in style: PieceStyle) -> String {
        let index = PieceKind.allCases.firstIndex(of: kind)!
        switch style {
        case .glyphs:
            return String(Array(color == .white ? "♔♕♖♗♘♙" : "♚♛♜♝♞♟")[index])
        case .letters:
            let letter = String(Array("KQRBNP")[index])
            return color == .white ? letter : letter.lowercased()
        }
    }
}

struct Move: Equatable, Sendable {
    let from: Square
    let to: Square
}

/// Toy game: enough to draw and move pieces. The real rules live in the chess engine.
struct Game: Equatable, Sendable {
    private(set) var pieces: [BoardPiece]
    private(set) var turn: PieceColor = .white
    private(set) var lastMove: Move?

    func piece(at square: Square) -> BoardPiece? {
        pieces.first { $0.square == square }
    }

    /// Toy rule for the article: any square that is not occupied by one of your pieces.
    func targets(from square: Square) -> Set<Square> {
        guard let piece = piece(at: square), piece.color == turn else { return [] }
        return Set(Square.all.filter { self.piece(at: $0)?.color != piece.color })
    }

    func isLegal(_ move: Move) -> Bool {
        targets(from: move.from).contains(move.to)
    }

    mutating func execute(_ move: Move) {
        guard isLegal(move) else { return }
        pieces.removeAll { $0.square == move.to }            // capture: that view goes away
        if let index = pieces.firstIndex(where: { $0.square == move.from }) {
            pieces[index].square = move.to                   // same id, new square: the view slides
        }
        lastMove = move
        turn = turn.opponent
    }

    static let initial: Game = {
        let backRank: [PieceKind] = [.rook, .knight, .bishop, .queen, .king, .bishop, .knight, .rook]
        var pieces: [BoardPiece] = []
        for file in 0..<8 {
            pieces.append(BoardPiece(id: pieces.count, kind: backRank[file], color: .white, square: Square(file: file, rank: 0)))
            pieces.append(BoardPiece(id: pieces.count, kind: .pawn, color: .white, square: Square(file: file, rank: 1)))
            pieces.append(BoardPiece(id: pieces.count, kind: .pawn, color: .black, square: Square(file: file, rank: 6)))
            pieces.append(BoardPiece(id: pieces.count, kind: backRank[file], color: .black, square: Square(file: file, rank: 7)))
        }
        return Game(pieces: pieces)
    }()
}

// MARK: - Geometry: square ↔ point (the only place that knows the orientation)

extension Square {
    /// Centre of the square on a board whose squares measure `squareSize`.
    func center(squareSize: CGFloat, orientation: Orientation) -> CGPoint {
        let column = orientation == .white ? file : 7 - file
        let row = orientation == .white ? 7 - rank : rank
        return CGPoint(x: (CGFloat(column) + 0.5) * squareSize,
                       y: (CGFloat(row) + 0.5) * squareSize)
    }

    /// The square under `point`, or `nil` outside the board.
    init?(point: CGPoint, squareSize: CGFloat, orientation: Orientation) {
        guard squareSize > 0 else { return nil }
        let column = Int(floor(point.x / squareSize))
        let row = Int(floor(point.y / squareSize))
        guard (0..<8).contains(column), (0..<8).contains(row) else { return nil }
        self.init(file: orientation == .white ? column : 7 - column,
                  rank: orientation == .white ? 7 - row : row)
    }
}

// MARK: - Layers

struct BoardTheme: Equatable, Sendable {
    var light: Color
    var dark: Color
    var lastMove: Color
    var selection: Color

    static let `default` = BoardTheme(
        light: Color(red: 0.87, green: 0.89, blue: 0.90),
        dark: Color(red: 0.58, green: 0.67, blue: 0.71),
        lastMove: Color.yellow.opacity(0.4),
        selection: Color.purple
    )
}

/// Layer 1: the 64 squares, placed with the same `center` as everything else.
struct SquaresLayer: View {
    let theme: BoardTheme
    let orientation: Orientation
    let squareSize: CGFloat

    var body: some View {
        ZStack {
            ForEach(Square.all) { square in
                Rectangle()
                    .fill(square.isLight ? theme.light : theme.dark)
                    .frame(width: squareSize, height: squareSize)
                    .position(square.center(squareSize: squareSize, orientation: orientation))
            }
        }
    }
}

/// One marked square: last move, selection or the square under the finger.
struct SquareMark: View {
    let square: Square
    let fill: Color
    var stroke: Color? = nil
    let squareSize: CGFloat
    let orientation: Orientation

    var body: some View {
        Rectangle()
            .fill(fill)
            .overlay {
                if let stroke { Rectangle().stroke(stroke, lineWidth: 4) }
            }
            .frame(width: squareSize, height: squareSize)
            .position(square.center(squareSize: squareSize, orientation: orientation))
            .allowsHitTesting(false)
    }
}

/// One piece. Its inputs are plain values, so SwiftUI skips the pieces that do not change
/// while the dragged one follows the finger.
struct PieceView: View, Equatable {
    let piece: BoardPiece
    let style: PieceStyle
    let position: CGPoint
    let squareSize: CGFloat
    let dragTranslation: CGSize?

    var body: some View {
        Text(piece.symbol(in: style))
            .font(.system(size: squareSize * 0.8))
            .frame(width: squareSize, height: squareSize)
            .scaleEffect(dragTranslation == nil ? 1 : 1.3)
            .position(position)
            .offset(dragTranslation ?? .zero)
    }
}
