package pl.mebloprojekt.core

import kotlin.math.max

object CabinetCalculator {
    fun calculate(spec: CabinetSpec): CabinetCalculation {
        val warnings = mutableListOf<CabinetWarning>()
        val t = spec.boardMaterial.thicknessMm

        require(spec.widthMm > 0 && spec.heightMm > 0 && spec.depthMm > 0) {
            "Wymiary szafki muszą być dodatnie."
        }
        require(t > 0) { "Grubość płyty musi być dodatnia." }
        require(spec.shelfCount >= 0) { "Liczba półek nie może być ujemna." }
        require(spec.doorCount >= 0) { "Liczba drzwi nie może być ujemna." }

        val internalWidth = spec.widthMm - 2 * t
        val internalHeight = spec.heightMm - 2 * t

        if (internalWidth <= 0) {
            warnings += CabinetWarning(
                "CABINET_TOO_NARROW",
                "Szerokość korpusu jest zbyt mała względem grubości boków.",
                isBlocking = true
            )
        }
        if (internalHeight <= 0) {
            warnings += CabinetWarning(
                "CABINET_TOO_LOW",
                "Wysokość korpusu jest zbyt mała względem grubości góry i dna.",
                isBlocking = true
            )
        }

        val horizontalWidth = when (spec.horizontalAssembly) {
            HorizontalAssembly.BETWEEN_SIDES -> internalWidth
            HorizontalAssembly.OUTSIDE_SIDES -> spec.widthMm
        }
        val sideHeight = when (spec.horizontalAssembly) {
            HorizontalAssembly.BETWEEN_SIDES -> spec.heightMm
            HorizontalAssembly.OUTSIDE_SIDES -> internalHeight
        }

        val insetSetback = if (spec.frontMount == FrontMount.INSET && spec.doorCount > 0) {
            spec.frontMaterial.thicknessMm + spec.insetShelfExtraSetbackMm
        } else {
            0
        }
        val shelfDepth = spec.depthMm - insetSetback
        if (shelfDepth <= 0) {
            warnings += CabinetWarning(
                "SHELF_DEPTH_INVALID",
                "Po cofnięciu pod front wpuszczany półka nie ma dodatniej głębokości.",
                isBlocking = true
            )
        }

        val totalDepth = spec.depthMm + if (spec.frontMount == FrontMount.OVERLAY && spec.doorCount > 0) {
            spec.frontMaterial.thicknessMm
        } else {
            0
        }

        val compartmentHeights = calculateCompartments(spec, internalHeight, warnings)
        val parts = mutableListOf<BoardPart>()
        val pvc2 = EdgeBanding(2.0)

        parts += BoardPart(
            id = "side",
            name = "Bok",
            kind = PartKind.SIDE,
            quantity = 2,
            widthMm = spec.depthMm,
            heightMm = max(0, sideHeight),
            thicknessMm = t,
            material = spec.boardMaterial,
            edgeBanding = mapOf(EdgeSide.FRONT to pvc2)
        )

        parts += BoardPart(
            id = "top",
            name = "Góra",
            kind = PartKind.TOP,
            quantity = 1,
            widthMm = max(0, horizontalWidth),
            heightMm = spec.depthMm,
            thicknessMm = t,
            material = spec.boardMaterial,
            edgeBanding = mapOf(EdgeSide.FRONT to pvc2)
        )

        parts += BoardPart(
            id = "bottom",
            name = "Dno",
            kind = PartKind.BOTTOM,
            quantity = 1,
            widthMm = max(0, horizontalWidth),
            heightMm = spec.depthMm,
            thicknessMm = t,
            material = spec.boardMaterial,
            edgeBanding = mapOf(EdgeSide.FRONT to pvc2)
        )

        if (spec.shelfCount > 0) {
            parts += BoardPart(
                id = "shelf",
                name = "Półka",
                kind = PartKind.SHELF,
                quantity = spec.shelfCount,
                widthMm = max(0, internalWidth),
                heightMm = max(0, shelfDepth),
                thicknessMm = t,
                material = spec.boardMaterial,
                edgeBanding = mapOf(EdgeSide.FRONT to pvc2),
                notes = if (insetSetback > 0) {
                    listOf("Cofnięcie od frontu: $insetSetback mm")
                } else {
                    emptyList()
                }
            )
        }

        when (spec.backType) {
            BackType.HDF -> parts += BoardPart(
                id = "back-hdf",
                name = "Plecy HDF",
                kind = PartKind.BACK,
                quantity = 1,
                widthMm = max(0, spec.widthMm - 2),
                heightMm = max(0, spec.heightMm - 2),
                thicknessMm = spec.backMaterial.thicknessMm,
                material = spec.backMaterial,
                notes = listOf("Luz 1 mm z każdej strony; plecy przybijane od tyłu")
            )

            BackType.BOARD -> parts += BoardPart(
                id = "back-board",
                name = "Plecy z płyty",
                kind = PartKind.BACK,
                quantity = 1,
                widthMm = spec.widthMm,
                heightMm = spec.heightMm,
                thicknessMm = spec.backMaterial.thicknessMm,
                material = spec.backMaterial,
                notes = listOf("Pełny wymiar; plecy przybijane od tyłu")
            )

            BackType.NONE -> Unit
        }

        parts += calculateFronts(spec, internalWidth, internalHeight, warnings)

        return CabinetCalculation(
            spec = spec,
            parts = parts,
            internalWidthMm = max(0, internalWidth),
            internalHeightMm = max(0, internalHeight),
            totalDepthIncludingFrontMm = max(0, totalDepth),
            shelfDepthMm = max(0, shelfDepth),
            compartmentHeightsMm = compartmentHeights,
            warnings = warnings
        )
    }

    private fun calculateFronts(
        spec: CabinetSpec,
        internalWidth: Int,
        internalHeight: Int,
        warnings: MutableList<CabinetWarning>
    ): List<BoardPart> {
        if (spec.doorCount == 0) return emptyList()

        val c = spec.frontClearances
        val baseWidth = if (spec.frontMount == FrontMount.OVERLAY) spec.widthMm else internalWidth
        val baseHeight = if (spec.frontMount == FrontMount.OVERLAY) spec.heightMm else internalHeight
        val gaps = c.betweenDoorsMm * (spec.doorCount - 1)
        val availableWidth = baseWidth - c.leftMm - c.rightMm - gaps
        val frontWidth = availableWidth / spec.doorCount
        val frontHeight = baseHeight - c.topMm - c.bottomMm

        if (availableWidth <= 0 || frontWidth <= 0 || frontHeight <= 0) {
            warnings += CabinetWarning(
                "FRONT_INVALID",
                "Fronty nie mieszczą się po uwzględnieniu luzów.",
                isBlocking = true
            )
        }
        if (availableWidth % spec.doorCount != 0) {
            warnings += CabinetWarning(
                "FRONT_FRACTION",
                "Szerokość frontów nie dzieli się równo przy dokładności 1 mm. Pozostaje ${availableWidth % spec.doorCount} mm do rozdzielenia."
            )
        }
        if (spec.frontMount == FrontMount.INSET && spec.frontMaterial.thicknessMm + spec.insetShelfExtraSetbackMm > spec.depthMm) {
            warnings += CabinetWarning(
                "INSET_FRONT_COLLISION",
                "Front wpuszczany koliduje z głębokością wnętrza.",
                isBlocking = true
            )
        }

        return listOf(
            BoardPart(
                id = "front",
                name = if (spec.doorCount == 1) "Front" else "Front drzwiowy",
                kind = PartKind.FRONT,
                quantity = spec.doorCount,
                widthMm = max(0, frontWidth),
                heightMm = max(0, frontHeight),
                thicknessMm = spec.frontMaterial.thicknessMm,
                material = spec.frontMaterial,
                edgeBanding = EdgeSide.entries.associateWith { EdgeBanding(2.0) },
                notes = listOf(
                    if (spec.frontMount == FrontMount.OVERLAY) "Front nakładany" else "Front wpuszczany",
                    "Domyślny kąt otwarcia: ${spec.doorOpeningAngleDeg}°"
                )
            )
        )
    }

    private fun calculateCompartments(
        spec: CabinetSpec,
        internalHeight: Int,
        warnings: MutableList<CabinetWarning>
    ): List<Int> {
        val clearTotal = internalHeight - spec.shelfCount * spec.boardMaterial.thicknessMm
        if (clearTotal < 0) {
            warnings += CabinetWarning(
                "SHELVES_TOO_MANY",
                "Półki wraz z grubością nie mieszczą się w wysokości wewnętrznej.",
                isBlocking = true
            )
            return List(spec.shelfCount + 1) { 0 }
        }

        val custom = spec.customCompartmentHeightsMm
        if (custom != null) {
            if (custom.size != spec.shelfCount + 1) {
                warnings += CabinetWarning(
                    "COMPARTMENT_COUNT_MISMATCH",
                    "Liczba wysokości komór nie odpowiada liczbie półek."
                )
            } else {
                val difference = clearTotal - custom.sum()
                if (difference != 0) {
                    warnings += CabinetWarning(
                        "COMPARTMENT_SUM_MISMATCH",
                        "Suma wysokości komór różni się od dostępnej przestrzeni o $difference mm."
                    )
                }
                if (custom.any { it < 0 }) {
                    warnings += CabinetWarning(
                        "COMPARTMENT_NEGATIVE",
                        "Wysokość komory nie może być ujemna.",
                        isBlocking = true
                    )
                }
                return custom
            }
        }

        val count = spec.shelfCount + 1
        val base = if (count > 0) clearTotal / count else 0
        val remainder = if (count > 0) clearTotal % count else 0
        return List(count) { index -> base + if (index < remainder) 1 else 0 }
    }
}
