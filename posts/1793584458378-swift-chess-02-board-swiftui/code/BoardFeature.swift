// BoardFeature.swift — el tablero con The Composable Architecture (1.x, @ObservableState).
// Necesita Board.swift y el paquete swift-composable-architecture.
// Ejemplo reescrito y reducido: sin promoción, sin jaque y con reglas de juguete.

import ComposableArchitecture
import SwiftUI

// MARK: - Child features

/// Background: only what the squares need. A theme change touches nothing else.
@Reducer
struct BackgroundFeature {
    @ObservableState
    struct State: Equatable {
        var theme: BoardTheme = .default
    }

    enum Action: Sendable {
        case setTheme(BoardTheme)
    }

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case let .setTheme(theme):
                state.theme = theme
                return .none
            }
        }
    }
}

/// Pieces: the look of the pieces and the gestures. It never moves a piece by itself;
/// it tells the board what the person did.
@Reducer
struct PiecesFeature {
    @ObservableState
    struct State: Equatable {
        var style: PieceStyle = .glyphs
    }

    enum Action: Sendable {
        case setStyle(PieceStyle)
        case delegate(Delegate)

        @CasePathable
        enum Delegate: Sendable {
            case userTap(on: Square)
            /// Once, when the press becomes a drag.
            case userStartDragging(on: Square)
            /// Only when the square under the finger changes.
            case userDragging(on: Square)
            case userEndDragging(on: Square)
            /// The drag ended outside the board.
            case userCancelDragging
        }
    }

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case let .setStyle(style):
                state.style = style
                return .none
            case .delegate:
                return .none
            }
        }
    }
}

// MARK: - Board feature

@Reducer
struct BoardFeature {
    @ObservableState
    struct State: Equatable {
        var game = Game.initial
        var orientation: Orientation = .white
        var background = BackgroundFeature.State()
        var pieces = PiecesFeature.State()
        var selectedSquare: Square?
        var legalTargets: Set<Square> = []
        var draggedSquare: Square?
    }

    enum Action: Sendable {
        // Orders from the parent screen
        case setGame(Game)
        case setOrientation(Orientation)
        // Child features
        case background(BackgroundFeature.Action)
        case pieces(PiecesFeature.Action)
        // From this view
        case legalTargetTapped(Square)
        // To the parent screen
        case delegate(Delegate)

        @CasePathable
        enum Delegate: Sendable {
            case userMoved(Move)
        }
    }

    var body: some ReducerOf<Self> {
        Scope(state: \.background, action: \.background) { BackgroundFeature() }
        Scope(state: \.pieces, action: \.pieces) { PiecesFeature() }
        Reduce { state, action in
            switch action {
            case let .setGame(game):
                state.game = game
                state.clearSelection()
                return .none

            case let .setOrientation(orientation):
                state.orientation = orientation
                return .none

            case let .pieces(.delegate(.userTap(on: square))),
                 let .pieces(.delegate(.userStartDragging(on: square))):
                state.select(square)
                return .none

            case let .pieces(.delegate(.userDragging(on: square))):
                state.draggedSquare = square
                return .none

            case let .pieces(.delegate(.userEndDragging(on: square))),
                 let .legalTargetTapped(square):
                return play(&state, to: square)

            case .pieces(.delegate(.userCancelDragging)):
                state.clearSelection()
                return .none

            case .background, .pieces, .delegate:
                return .none
            }
        }
    }

    /// The board applies the rules; the parent only hears about moves that were played.
    private func play(_ state: inout State, to square: Square) -> Effect<Action> {
        defer { state.clearSelection() }
        guard let from = state.selectedSquare else { return .none }
        let move = Move(from: from, to: square)
        guard state.game.isLegal(move) else { return .none }
        state.game.execute(move)
        return .send(.delegate(.userMoved(move)))
    }
}

extension BoardFeature.State {
    mutating func select(_ square: Square) {
        let targets = game.targets(from: square)
        selectedSquare = targets.isEmpty ? nil : square
        legalTargets = targets
    }

    mutating func clearSelection() {
        selectedSquare = nil
        legalTargets = []
        draggedSquare = nil
    }
}

// MARK: - Configuration: what each screen wants to see (not state)

struct BoardConfiguration: Equatable, Sendable {
    var movableSides: Set<PieceColor>
    var pieceAnimationDuration: Double
    var showsLastMove: Bool
    var showsSelection: Bool
    var showsLegalMoves: Bool

    static let full = BoardConfiguration(
        movableSides: [.white, .black], pieceAnimationDuration: 0.18,
        showsLastMove: true, showsSelection: true, showsLegalMoves: true
    )
    static let viewer = BoardConfiguration(
        movableSides: [], pieceAnimationDuration: 0.18,
        showsLastMove: true, showsSelection: false, showsLegalMoves: false
    )
}

// MARK: - Views

struct BoardView: View {
    let store: StoreOf<BoardFeature>
    var configuration: BoardConfiguration = .full

    var body: some View {
        GeometryReader { proxy in
            let side = min(proxy.size.width, proxy.size.height)
            let squareSize = side / 8
            let orientation = store.orientation
            ZStack {
                // 1 · background group: its own store, it only reads the theme
                BackgroundLayer(
                    store: store.scope(state: \.background, action: \.background),
                    orientation: orientation,
                    squareSize: squareSize
                )
                // 2 · game group: jumps to the new squares, never slides with the piece
                lastMove(squareSize: squareSize)
                    .animation(nil, value: store.game)
                // 3–4 · interaction group, below the pieces
                selection(squareSize: squareSize)
                // 6 · pieces group: one ZStack, one animation
                PiecesLayer(
                    store: store.scope(state: \.pieces, action: \.pieces),
                    pieces: store.game.pieces,
                    orientation: orientation,
                    squareSize: squareSize,
                    animationDuration: configuration.pieceAnimationDuration
                )
                .allowsHitTesting(configuration.movableSides.contains(store.game.turn))
                // 7 · interaction group, above the pieces: the dots are buttons
                legalMoves(squareSize: squareSize)
            }
            .frame(width: side, height: side)
        }
        .aspectRatio(1, contentMode: .fit)
    }

    @ViewBuilder
    private func lastMove(squareSize: CGFloat) -> some View {
        if configuration.showsLastMove, let move = store.game.lastMove {
            ForEach([move.from, move.to]) { square in
                SquareMark(square: square, fill: store.background.theme.lastMove,
                           squareSize: squareSize, orientation: store.orientation)
            }
        }
    }

    @ViewBuilder
    private func selection(squareSize: CGFloat) -> some View {
        if configuration.showsSelection {
            if let square = store.selectedSquare {
                SquareMark(square: square, fill: Color.red.opacity(0.4),
                           squareSize: squareSize, orientation: store.orientation)
            }
            if let square = store.draggedSquare {
                let color = store.background.theme.selection
                SquareMark(square: square, fill: color.opacity(0.15), stroke: color,
                           squareSize: squareSize, orientation: store.orientation)
            }
        }
    }

    @ViewBuilder
    private func legalMoves(squareSize: CGFloat) -> some View {
        if configuration.showsLegalMoves {
            ForEach(Array(store.legalTargets)) { square in
                Button {
                    store.send(.legalTargetTapped(square))
                } label: {
                    Circle()
                        .fill(Color.black.opacity(0.4))
                        .padding(squareSize / 3)
                        .frame(width: squareSize, height: squareSize)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .position(square.center(squareSize: squareSize, orientation: store.orientation))
            }
        }
    }
}

struct BackgroundLayer: View {
    let store: StoreOf<BackgroundFeature>
    let orientation: Orientation
    let squareSize: CGFloat

    var body: some View {
        SquaresLayer(theme: store.theme, orientation: orientation, squareSize: squareSize)
    }
}

/// The piece being dragged. It lives in the view, not in the store: the store only hears
/// about the start, each new square and the drop.
struct PieceDrag: Equatable {
    let square: Square
    var translation: CGSize = .zero
    var targetSquare: Square?

    mutating func move(translation: CGSize, over target: Square?) -> PiecesFeature.Action.Delegate? {
        self.translation = translation
        guard let target, target != targetSquare else { return nil }
        targetSquare = target
        return .userDragging(on: target)
    }
}

struct PiecesLayer: View {
    let store: StoreOf<PiecesFeature>
    let pieces: [BoardPiece]
    let orientation: Orientation
    let squareSize: CGFloat
    var animationDuration: Double = 0.18
    @State private var drag: PieceDrag?

    private static let space = "pieces"

    var body: some View {
        ZStack {
            ForEach(pieces) { piece in
                let isDragged = piece.square == drag?.square
                PieceView(
                    piece: piece,
                    style: store.style,
                    position: piece.square.center(squareSize: squareSize, orientation: orientation),
                    squareSize: squareSize,
                    dragTranslation: isDragged ? drag?.translation : nil
                )
                .zIndex(isDragged ? 1 : 0)
                .onTapGesture {
                    store.send(.delegate(.userTap(on: piece.square)))
                }
                .gesture(dragGesture(from: piece.square))
            }
        }
        .coordinateSpace(.named(Self.space))
        .animation(.snappy(duration: animationDuration), value: pieces)
    }

    private func dragGesture(from square: Square) -> some Gesture {
        DragGesture(minimumDistance: 10, coordinateSpace: .named(Self.space))
            .onChanged { value in
                if drag == nil {
                    drag = PieceDrag(square: square)
                    store.send(.delegate(.userStartDragging(on: square)))
                }
                let target = Square(point: value.location, squareSize: squareSize, orientation: orientation)
                if let action = drag?.move(translation: value.translation, over: target) {
                    store.send(.delegate(action))
                }
            }
            .onEnded { value in
                let target = Square(point: value.location, squareSize: squareSize, orientation: orientation)
                // The dropped piece is already on its square: no slide back from the origin.
                var transaction = Transaction()
                transaction.disablesAnimations = true
                withTransaction(transaction) {
                    drag = nil
                    if let target {
                        store.send(.delegate(.userEndDragging(on: target)))
                    } else {
                        store.send(.delegate(.userCancelDragging))
                    }
                }
            }
    }
}

#Preview {
    BoardView(store: Store(initialState: BoardFeature.State()) { BoardFeature() })
        .padding()
}
