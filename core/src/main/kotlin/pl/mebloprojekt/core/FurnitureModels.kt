package pl.mebloprojekt.core

enum class HorizontalAssembly {
    BETWEEN_SIDES,
    OUTSIDE_SIDES
}

enum class FrontMount {
    OVERLAY,
    INSET
}

enum class BackType {
    HDF,
    BOARD,
    NONE
}

enum class PartKind {
    SIDE,
    TOP,
    BOTTOM,
    SHELF,
    BACK,
    FRONT,
    FIXED_PANEL,
    STRENGTHENER
}

enum class EdgeSide {
    FRONT,
    BACK,
    LEFT,
    RIGHT
}

data class MaterialSpec(
    val id: String,
    val name: String,
    val thicknessMm: Int,
    val grainMatters: Boolean = false
)

data class EdgeBanding(
    val thicknessMm: Double,
    val label: String = "PVC"
)

data class FrontClearances(
    val leftMm: Int = 2,
    val rightMm: Int = 2,
    val topMm: Int = 2,
    val bottomMm: Int = 2,
    val betweenDoorsMm: Int = 2
)

data class CabinetSpec(
    val name: String = "Szafka 1",
    val widthMm: Int,
    val heightMm: Int,
    val depthMm: Int,
    val boardMaterial: MaterialSpec,
    val frontMaterial: MaterialSpec = boardMaterial,
    val backMaterial: MaterialSpec = MaterialSpec("hdf-white", "Plecy HDF białe", 3),
    val shelfCount: Int = 2,
    val doorCount: Int = 2,
    val horizontalAssembly: HorizontalAssembly = HorizontalAssembly.BETWEEN_SIDES,
    val frontMount: FrontMount = FrontMount.OVERLAY,
    val backType: BackType = BackType.HDF,
    val frontClearances: FrontClearances = FrontClearances(),
    val insetShelfExtraSetbackMm: Int = 2,
    val customCompartmentHeightsMm: List<Int>? = null,
    val doorOpeningAngleDeg: Int = 90
)

data class BoardPart(
    val id: String,
    val name: String,
    val kind: PartKind,
    val quantity: Int,
    val widthMm: Int,
    val heightMm: Int,
    val thicknessMm: Int,
    val material: MaterialSpec,
    val edgeBanding: Map<EdgeSide, EdgeBanding> = emptyMap(),
    val notes: List<String> = emptyList(),
    val postProductionCuts: List<PostProductionCut> = emptyList()
)

sealed interface PostProductionCut {
    val description: String

    data class CornerRectangle(
        val corner: String,
        val widthMm: Int,
        val depthMm: Int
    ) : PostProductionCut {
        override val description: String =
            "Wycięcie narożne $corner: ${widthMm} × ${depthMm} mm"
    }

    data class Rectangle(
        val widthMm: Int,
        val heightMm: Int,
        val offsetXmm: Int,
        val offsetYmm: Int
    ) : PostProductionCut {
        override val description: String =
            "Otwór prostokątny ${widthMm} × ${heightMm} mm, pozycja $offsetXmm / $offsetYmm mm"
    }

    data class Circle(
        val diameterMm: Int,
        val centerXmm: Int,
        val centerYmm: Int
    ) : PostProductionCut {
        override val description: String =
            "Otwór Ø$diameterMm mm, środek $centerXmm / $centerYmm mm"
    }
}

data class CabinetWarning(
    val code: String,
    val message: String,
    val isBlocking: Boolean = false
)

data class CabinetCalculation(
    val spec: CabinetSpec,
    val parts: List<BoardPart>,
    val internalWidthMm: Int,
    val internalHeightMm: Int,
    val totalDepthIncludingFrontMm: Int,
    val shelfDepthMm: Int,
    val compartmentHeightsMm: List<Int>,
    val warnings: List<CabinetWarning>
)
